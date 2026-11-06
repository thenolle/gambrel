import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp } from '@gambrel/compiler'
import { appRoot } from './support.ts'

let outDir = ''
let baseUrl = ''
let child: { kill(): void; readonly exited: Promise<number> } | undefined

async function readListeningUrl(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let output = ''
  for (;;) {
    const { value, done } = await reader.read()
    if (done) break
    output += decoder.decode(value, { stream: true })
    const match = /Listening on (http:\/\/\S+)/.exec(output)
    if (match?.[1] !== undefined) {
      void (async () => {
        while (!(await reader.read()).done) {
          continue
        }
      })()
      return match[1]
    }
  }
  throw new Error(`The server never reported a listening URL. Output: ${output}`)
}

beforeAll(async () => {
  outDir = await mkdtemp(join(tmpdir(), 'gambrel-prod-'))
  await buildApp({ root: appRoot, config: { outDir }, mode: 'production' })
  const process_ = Bun.spawn([process.execPath, join(outDir, 'server', 'index.js')], {
    cwd: appRoot,
    env: { ...process.env, NODE_ENV: 'production', PORT: '0', GAMBREL_CLIENT_DIR: join(outDir, 'client') },
    stdout: 'pipe',
    stderr: 'inherit'
  })
  child = process_
  baseUrl = await readListeningUrl(process_.stdout)
}, 60_000)

afterAll(async () => {
  child?.kill()
  await child?.exited
  await rm(outDir, { recursive: true, force: true })
})

function get(path: string): Promise<Response> {
  return fetch(new URL(path, baseUrl), { redirect: 'manual' })
}

describe('the built production server', () => {
  test('serves server-rendered documents that reference the built entry', async () => {
    const response = await get('/')
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('<script type="module" src="/assets/client.js" data-gambrel="entry"></script>')
    expect(html).toContain('id="gambrel-data"')
  })

  test('serves the browser bundle as JavaScript, byte for byte', async () => {
    const response = await get('/assets/client.js')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('javascript')
    expect(await response.text()).toBe(await readFile(join(outDir, 'client', 'client.js'), 'utf8'))
  })

  test('a missing asset is a plain-text 404', async () => {
    const response = await get('/assets/missing.js')
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('text/plain')
  })

  test('dynamic routes, 404s and guards behave as in development', async () => {
    expect(await (await get('/users/2')).text()).toContain('Grace Hopper')
    expect((await get('/users/999')).status).toBe(404)
    const redirect = await get('/admin')
    expect(redirect.status).toBe(302)
    expect(redirect.headers.get('location')).toBe('/')
  })
})