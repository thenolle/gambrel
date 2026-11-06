import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { serve, type ServerHandle } from '@gambrel/bun'
import { bundleApp } from '../scripts/bundle.ts'
import { createSiteApp } from '../scripts/serve.ts'

let server: ServerHandle

beforeAll(async () => {
  await bundleApp(false)
  server = serve(createSiteApp(), { port: 0, hostname: '127.0.0.1' })
}, 60_000)

afterAll(async () => {
  await server.stop(true)
})

function get(path: string): Promise<Response> {
  return fetch(new URL(path, server.url))
}

describe('the documentation server', () => {
  test('serves the shell, the stylesheet and the bundled app', async () => {
    const shell = await get('/')
    expect(shell.status).toBe(200)
    expect(shell.headers.get('content-type')).toContain('text/html')
    expect(await shell.text()).toContain('id="content"')
    expect((await get('/styles.css')).headers.get('content-type')).toContain('css')
    const app = await get('/app.js')
    expect(app.status).toBe(200)
    expect(app.headers.get('content-type')).toContain('javascript')
  })

  test('serves the navigation and the Markdown sources', async () => {
    const nav = (await (await get('/docs/nav.json')).json()) as { sections: Array<{ pages: Array<{ path: string }> }> }
    for (const section of nav.sections) {
      for (const page of section.pages) {
        expect((await get(`/docs/${page.path}.md`)).status, page.path).toBe(200)
      }
    }
  })

  test('missing files and traversal are 404s', async () => {
    expect((await get('/docs/missing.md')).status).toBe(404)
    expect((await get('/docs/..%2f..%2fpackage.json')).status).toBe(404)
  })
})