import { afterAll, beforeAll, describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { hydrateRoutes, type HydrationMismatch } from '@gambrel/browser'
import { serve, type ServerHandle } from '@gambrel/bun'
import { generateRoutes } from '@gambrel/compiler'
import { parsePayload } from '@gambrel/router'
import { Window } from 'happy-dom'

const root = join(import.meta.dir, '..')
let server: ServerHandle

beforeAll(async () => {
  await generateRoutes({ root })
  const { createApplication } = await import('../src/app.ts')
  server = serve(createApplication({ development: false, entry: '/assets/client.js', clientDir: join(root, 'dist', 'client') }), { port: 0, hostname: '127.0.0.1' })
})

afterAll(async () => {
  await server.stop(true)
})

function get(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(new URL(path, server.url), { redirect: 'manual', ...init })
}

function payloadOf(html: string): ReturnType<typeof parsePayload> {
  const match = /<script type="application\/json" id="gambrel-data" data-gambrel="payload">([\s\S]*?)<\/script>/.exec(html)
  if (match?.[1] === undefined) throw new Error('No hydration payload in the document')
  return parsePayload(match[1])
}

async function loadPage(path: string): Promise<{ document: Document; window: Window }> {
  const html = await (await get(path)).text()
  const window = new Window({
    url: `http://localhost${path}`,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true
    }
  })
  const document = window.document as unknown as Document
  document.open()
  document.write(html)
  document.close()
  return { document, window }
}

describe('server-rendered documents over HTTP', () => {
  test('home and about return HTML with the entry and payload', async () => {
    for (const path of ['/', '/about']) {
      const response = await get(path)
      const html = await response.text()
      expect(response.status).toBe(200)
      expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
      expect(html).toContain('<script type="module" src="/assets/client.js" data-gambrel="entry"></script>')
      expect(payloadOf(html).pathname).toBe(path)
    }
    expect(await (await get('/')).text()).toContain('Clicked')
  })

  test('the dynamic user route renders loader data in nested layouts', async () => {
    const html = await (await get('/users/1')).text()
    expect(html).toContain('Ada Lovelace')
    expect(html).toContain('3 users')
    const payload = payloadOf(html)
    expect(payload.params).toEqual({ id: '1' })
    expect(payload.chain.map((entry) => entry.id)).toEqual(['layout:/', 'layout:/users', 'page:/users/[id]'])
    expect(payload.chain[1]?.data).toEqual({ total: 3 })
    expect(await (await get('/users/2')).text()).toContain('Grace Hopper')
  })

  test('unknown routes and unknown users return 404 without scripts', async () => {
    for (const path of ['/nope', '/users/999']) {
      const response = await get(path)
      expect(response.status).toBe(404)
      expect(await response.text()).not.toContain('<script')
    }
  })

  test('the guard redirects without a header and continues with one', async () => {
    const denied = await get('/admin')
    expect(denied.status).toBe(302)
    expect(denied.headers.get('location')).toBe('/')
    const allowed = await get('/admin', { headers: { 'x-demo-user': 'ada' } })
    expect(allowed.status).toBe(200)
    expect(await allowed.text()).toContain('Signed in as ada')
  })

  test('explicit core routes and method handling still work', async () => {
    expect(await (await get('/api/health')).json()).toEqual({ ok: true })
    const post = await get('/about', { method: 'POST' })
    expect(post.status).toBe(405)
    expect(post.headers.get('allow')).toBe('GET, HEAD')
  })
})

describe('browser hydration of the real documents', () => {
  for (const path of ['/', '/users/1']) {
    test(`hydrates ${path} without mismatches and keeps the server DOM`, async () => {
      const { document, window } = await loadPage(path)
      const client = await import('../.gambrel/manifest.client.ts')
      const heading = document.querySelector('h1')
      const found: HydrationMismatch[] = []
      const result = hydrateRoutes({
        routes: client.routes,
        components: client.components,
        document,
        onMismatch: (mismatch) => void found.push(mismatch)
      })
      expect(found).toEqual([])
      expect(result.mismatches).toEqual([])
      expect(document.querySelector('h1')).toBe(heading)

      const button = document.querySelector('button')
      if (path === '/') {
        if (button === null) throw new Error('Counter button missing')
        button.dispatchEvent(new window.Event('click', { bubbles: true }) as unknown as Event)
        expect(button.textContent).toBe('Clicked 1 times')
      }
    })
  }
})

describe('server/client boundary', () => {
  test('the client manifest never references server modules', async () => {
    const client = await readFile(join(root, '.gambrel', 'manifest.client.ts'), 'utf8')
    expect(client).not.toContain('.server')
    expect(client).not.toContain('hooksFromModule')
    expect(client).not.toContain('data/users')
  })
})