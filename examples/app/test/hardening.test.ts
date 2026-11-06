import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { hydrateRoutes, type HydrationMismatch } from '@gambrel/browser'
import type { ServerHandle } from '@gambrel/bun'
import { HydrationPayloadError } from '@gambrel/router'
import { loadPage, payloadOf, startTestServer } from './support.ts'

let server: ServerHandle

beforeAll(async () => {
  server = await startTestServer()
})

afterAll(async () => {
  await server.stop(true)
})

function get(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(new URL(path, server.url), { redirect: 'manual', ...init })
}

describe('URL edge cases', () => {
  test('malformed percent-encoding is a 400', async () => {
    const response = await get('/users/%E0%A4%A')
    expect(response.status).toBe(400)
  })

  test('the query string does not affect matching and trailing slashes are ignored', async () => {
    const withQuery = await get('/users/1?tab=2')
    expect(withQuery.status).toBe(200)
    expect(await withQuery.text()).toContain('Ada Lovelace')
    const trailing = await get('/about/')
    expect(trailing.status).toBe(200)
    expect(payloadOf(await trailing.text()).pathname).toBe('/about/')
  })

  test('HEAD returns the document headers without a body', async () => {
    const response = await get('/', { method: 'HEAD' })
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(await response.text()).toBe('')
  })

  test('hostile path segments are never reflected into the page', async () => {
    const response = await get('/users/%3Cscript%3Ealert(1)%3C%2Fscript%3E')
    const html = await response.text()
    expect(response.status).toBe(404)
    expect(html).not.toContain('<script>alert')
    expect(html).not.toContain('<script')
  })

  test('an unknown asset is a plain-text 404, not an HTML page', async () => {
    const response = await get('/assets/nope.js')
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toContain('text/plain')
  })
})

describe('catch-all route', () => {
  test('decodes segments into an array param and renders them', async () => {
    const response = await get('/docs/a%20b/c')
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(html).toContain('<p>a b / c</p>')
    expect(payloadOf(html).params).toEqual({ slug: ['a b', 'c'] })
  })

  test('requires at least one segment', async () => {
    expect((await get('/docs')).status).toBe(404)
  })
})

describe('hydration of more documents', () => {
  for (const path of ['/about', '/users', '/docs/a/b']) {
    test(`hydrates ${path} without mismatches`, async () => {
      const { document, pathname } = await loadPage(server, path)
      const client = await import('../.gambrel/manifest.client.ts')
      const main = document.querySelector('main')
      const found: HydrationMismatch[] = []
      hydrateRoutes({
        routes: client.routes,
        components: client.components,
        document,
        pathname,
        onMismatch: (mismatch) => void found.push(mismatch)
      })
      expect(found).toEqual([])
      expect(document.querySelector('main')).toBe(main)
    })
  }

  test('pages without loaders carry null data in the payload', async () => {
    const payload = payloadOf(await (await get('/about')).text())
    expect(payload.chain.map((entry) => entry.data)).toEqual([null, null])
  })
})

describe('payload failures leave the server markup untouched', () => {
  const cases: Array<[string, (html: string) => string]> = [
    ['a payload for another route', (html) => html.replace('"routeId":"page:/about"', '"routeId":"page:/users"')],
    ['a corrupted payload', (html) => html.replace('{"version":1,', '{"version":')]
  ]
  for (const [label, mutate] of cases) {
    test(`${label} is rejected without changing the DOM`, async () => {
      const { document, pathname } = await loadPage(server, '/about', mutate)
      const client = await import('../.gambrel/manifest.client.ts')
      const before = document.documentElement.outerHTML
      expect(() =>
        hydrateRoutes({ routes: client.routes, components: client.components, document, pathname })
      ).toThrow(HydrationPayloadError)
      expect(document.documentElement.outerHTML).toBe(before)
    })
  }
})