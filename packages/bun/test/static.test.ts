import { afterAll, beforeAll, expect, test } from 'bun:test'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp, text } from '@gambrel/core'
import { serve, staticFiles, type ServerHandle } from '../src/index.ts'

let root: string
let server: ServerHandle

beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'gambrel-static-'))
  await mkdir(join(root, 'public', 'nested'), { recursive: true })
  await writeFile(join(root, 'public', 'app.js'), 'console.log(1)\n')
  await writeFile(join(root, 'public', 'nested', 'a.txt'), 'nested')
  await writeFile(join(root, 'secret.txt'), 'secret')
  const app = createApp().use(staticFiles({ directory: join(root, 'public'), prefix: '/assets' })).notFound(() => text('fallback', { status: 404 }))
  server = serve(app, { port: 0, hostname: '127.0.0.1' })
})

afterAll(async () => {
  await server.stop(true)
  await rm(root, { recursive: true, force: true })
})

function get(path: string, init?: RequestInit): Promise<Response> {
  return fetch(new URL(path, server.url), init)
}

test('serves files with a content type', async () => {
  const response = await get('/assets/app.js')
  expect(response.status).toBe(200)
  expect(response.headers.get('content-type')).toContain('javascript')
  expect(await response.text()).toBe('console.log(1)\n')
  expect(await (await get('/assets/nested/a.txt')).text()).toBe('nested')
})

test('answers HEAD without a body', async () => {
  const response = await get('/assets/app.js', { method: 'HEAD' })
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('')
})

test('missing files, directories and traversal are plain 404s, never the fallback', async () => {
  for (const path of ['/assets/missing.js', '/assets/nested', '/assets/', '/assets/..%2fsecret.txt']) {
    const response = await get(path)
    const body = await response.text()
    expect(response.status).toBe(404)
    expect(body).toBe('Not Found')
  }
})

test('rejects malformed encoding and passes other requests through', async () => {
  expect((await get('/assets/%E0%A4%A')).status).toBe(400)
  expect(await (await get('/other')).text()).toBe('fallback')
  expect(await (await get('/assets/app.js', { method: 'POST' })).text()).toBe('fallback')
})