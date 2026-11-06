import { describe, expect, spyOn, test } from 'bun:test'
import { createApp, html, json, redirect, text } from '../src/index.ts'

function request(path: string, init?: RequestInit): Request {
  return new Request(`http://localhost${path}`, init)
}

describe('routing', () => {
  test('static routes outrank dynamic routes in either registration order', async () => {
    const first = createApp().get('/users/me', () => 'me').get('/users/:id', (ctx) => `user ${ctx.params.id}`)
    const second = createApp().get('/users/:id', (ctx) => `user ${ctx.params.id}`).get('/users/me', () => 'me')
    for (const app of [first, second]) {
      expect(await (await app.fetch(request('/users/me'))).text()).toBe('me')
      expect(await (await app.fetch(request('/users/42'))).text()).toBe('user 42')
    }
  })

  test('extracts typed, decoded params', async () => {
    const app = createApp().get('/users/:id/posts/:postId', (ctx) => json({ id: ctx.params.id, postId: ctx.params.postId }))
    const response = await app.fetch(request('/users/a%20b/posts/7'))
    expect(await response.json()).toEqual({ id: 'a b', postId: '7' })
  })

  test('ignores trailing slashes and keeps the query string out of matching', async () => {
    const app = createApp().get('/about', (ctx) => ctx.url.searchParams.get('x') ?? 'none')
    expect(await (await app.fetch(request('/about/?x=1'))).text()).toBe('1')
    expect(await (await app.fetch(request('/about'))).text()).toBe('none')
  })

  test('returns 404 for unknown paths', async () => {
    const app = createApp().get('/', () => 'home')
    const response = await app.fetch(request('/missing'))
    expect(response.status).toBe(404)
  })

  test('returns 405 with Allow when only the method differs', async () => {
    const app = createApp().get('/a', () => 'a').post('/a', () => 'a')
    const response = await app.fetch(request('/a', { method: 'DELETE' }))
    expect(response.status).toBe(405)
    expect(response.headers.get('allow')).toBe('GET, POST')
  })

  test('returns 400 for malformed percent-encoding', async () => {
    const app = createApp().get('/users/:id', () => 'ok')
    const response = await app.fetch(request('/users/%E0%A4%A'))
    expect(response.status).toBe(400)
  })

  test('rejects duplicate routes and invalid paths at registration', () => {
    expect(() => createApp().get('/a/:x', () => '').get('/a/:y', () => '')).toThrow()
    expect(() => createApp().get('a', () => '')).toThrow()
    expect(() => createApp().get('/a/:x/:x', () => '')).toThrow()
  })

  test('uses a custom notFound handler', async () => {
    const app = createApp().notFound(() => text('custom', { status: 404 }))
    const response = await app.fetch(request('/nope'))
    expect(await response.text()).toBe('custom')
    expect(response.status).toBe(404)
  })
})

describe('responses', () => {
  test('html() sets text/html and respects an explicit content type', async () => {
    const app = createApp().get('/page', () => html('<p>hi</p>')).get('/custom', () => html('<p>hi</p>', { headers: { 'content-type': 'text/x-custom' } }))
    const page = await app.fetch(request('/page'))
    expect(page.headers.get('content-type')).toBe('text/html; charset=utf-8')
    const custom = await app.fetch(request('/custom'))
    expect(custom.headers.get('content-type')).toBe('text/x-custom')
  })

  test('string results are text/plain and explicit status is preserved', async () => {
    const app = createApp().get('/s', () => 'hi').get('/created', () => json({ ok: true }, { status: 201 }))
    const plain = await app.fetch(request('/s'))
    expect(plain.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    const created = await app.fetch(request('/created'))
    expect(created.status).toBe(201)
    expect(created.headers.get('content-type')).toBe('application/json; charset=utf-8')
  })

  test('redirect sets status and location', async () => {
    const app = createApp().get('/old', () => redirect('/new', 301))
    const response = await app.fetch(request('/old'))
    expect(response.status).toBe(301)
    expect(response.headers.get('location')).toBe('/new')
  })
})

describe('middleware and errors', () => {
  test('middleware runs outermost first and can short-circuit', async () => {
    const order: string[] = []
    const app = createApp().use(async (_ctx, next) => {
      order.push('a:before')
      const response = await next()
      order.push('a:after')
      return response
    }).use((ctx, next) => (ctx.url.pathname === '/blocked' ? text('no', { status: 403 }) : next())).get('/ok', () => {
      order.push('handler')
      return 'ok'
    })
    await app.fetch(request('/ok'))
    expect(order).toEqual(['a:before', 'handler', 'a:after'])
    expect((await app.fetch(request('/blocked'))).status).toBe(403)
  })

  test('default error handler hides details in production', async () => {
    const spy = spyOn(console, 'error').mockImplementation(() => { })
    const app = createApp().get('/boom', () => {
      throw new Error('secret detail')
    })
    const response = await app.fetch(request('/boom'))
    expect(response.status).toBe(500)
    expect(await response.text()).toBe('Internal Server Error')
    spy.mockRestore()
  })

  test('development mode includes the error in the response', async () => {
    const spy = spyOn(console, 'error').mockImplementation(() => { })
    const app = createApp({ development: true }).get('/boom', () => {
      throw new Error('secret detail')
    })
    const response = await app.fetch(request('/boom'))
    expect(await response.text()).toContain('secret detail')
    spy.mockRestore()
  })

  test('an invalid handler result becomes a 500', async () => {
    const spy = spyOn(console, 'error').mockImplementation(() => { })
    const app = createApp().get('/bad', (() => undefined) as unknown as () => string)
    const response = await app.fetch(request('/bad'))
    expect(response.status).toBe(500)
    spy.mockRestore()
  })

  test('a custom onError handler receives the error', async () => {
    const app = createApp().onError((error) => text(`caught ${(error as Error).message}`, { status: 502 })).get('/boom', () => {
      throw new Error('x')
    })
    const response = await app.fetch(request('/boom'))
    expect(response.status).toBe(502)
    expect(await response.text()).toBe('caught x')
  })
})