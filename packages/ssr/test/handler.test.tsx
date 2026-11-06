/** @jsxImportSource @gambrel/view */
import { describe, expect, spyOn, test } from 'bun:test'
import {
  deny,
  notFound,
  parsePayload,
  redirect,
  type AnyRouteComponent,
  type EntryHooks,
  type HookContext,
  type HydrationPayload,
  type LayoutProps,
  type NotFoundOutcome,
  type PageProps,
  type ParamsOf,
  type RouteParams,
  type RouteRecord
} from '@gambrel/router'
import { raw, type Child } from '@gambrel/view'
import { createDocumentHandler, type DocumentHandlerOptions } from '../src/index.ts'

function RootLayout(props: LayoutProps<RouteParams, null>): Child {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Test</title>
      </head>
      <body>
        <main>{props.children}</main>
      </body>
    </html>
  )
}

function UsersLayout(props: LayoutProps<RouteParams, { section: string }>): Child {
  return <section data-section={props.data.section}>{props.children}</section>
}

function Home(): Child {
  return <h1>Home</h1>
}

function User(props: PageProps<ParamsOf<'/users/[id]'>, { name: string }>): Child {
  return (
    <p>
      {props.data.name} #{props.params.id}
    </p>
  )
}

function Plain(): Child {
  return <p>plain</p>
}

const routes: RouteRecord[] = [
  { id: 'page:/', pattern: '/', layouts: ['layout:/'] },
  { id: 'page:/users/[id]', pattern: '/users/[id]', layouts: ['layout:/', 'layout:/users'] },
  { id: 'page:/admin', pattern: '/admin', layouts: ['layout:/'] },
  { id: 'page:/vip', pattern: '/vip', layouts: ['layout:/'] },
  { id: 'page:/boom', pattern: '/boom', layouts: ['layout:/'] }
]

const components = new Map<string, AnyRouteComponent>([
  ['layout:/', RootLayout],
  ['layout:/users', UsersLayout],
  ['page:/', Home],
  ['page:/users/[id]', User],
  ['page:/admin', Plain],
  ['page:/vip', Plain],
  ['page:/boom', Plain]
])

function userLoader(ctx: HookContext<ParamsOf<'/users/[id]'>>): { name: string } | NotFoundOutcome {
  if (ctx.params.id === '404') return notFound()
  if (ctx.params.id === 'xss') return { name: '</script><img src=x onerror=alert(1)>' }
  return { name: `User ${ctx.params.id}` }
}

const hooks = new Map<string, EntryHooks<never>>([
  ['layout:/users', { loader: () => ({ section: 'Users' }) }],
  ['page:/users/[id]', { loader: userLoader }],
  ['page:/admin', { guard: () => redirect('/login', 302) }],
  ['page:/vip', { guard: () => deny(403, 'members only') }],
  ['page:/boom', { loader: () => { throw new Error('secret failure') } }]
])

function make(overrides: { entry?: string | undefined; development?: boolean } = {}) {
  const options: DocumentHandlerOptions = {
    routes,
    components,
    hooks,
    entry: '/assets/entry.js',
    development: false,
    ...overrides
  }
  return createDocumentHandler<null>(options)
}

function get(handler: ReturnType<typeof make>, path: string, method = 'GET'): Promise<Response> {
  return handler.handle(new Request(`http://localhost${path}`, { method }), null)
}

function payloadOf(html: string): HydrationPayload {
  const match = /<script type="application\/json" id="gambrel-data" data-gambrel="payload">([\s\S]*?)<\/script>/.exec(html)
  if (match?.[1] === undefined) throw new Error('No hydration payload in the document')
  return parsePayload(match[1])
}

describe('documents', () => {
  test('renders a complete server document with the entry and payload', async () => {
    const response = await get(make(), '/')
    const html = await response.text()
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(html.startsWith('<!doctype html><html lang="en">')).toBe(true)
    expect(html).toContain('<main><h1>Home</h1></main>')
    expect(html).toContain('<script type="module" src="/assets/entry.js" data-gambrel="entry"></script></body>')
    expect(payloadOf(html).routeId).toBe('page:/')
  })

  test('renders nested layouts with per-entry loader data and params', async () => {
    const html = await (await get(make(), '/users/42')).text()
    expect(html).toContain('<section data-section="Users"><p>User 42 #42</p></section>')
    const payload = payloadOf(html)
    expect(payload.pathname).toBe('/users/42')
    expect(payload.params).toEqual({ id: '42' })
    expect(payload.chain).toEqual([
      { id: 'layout:/', kind: 'layout', data: null },
      { id: 'layout:/users', kind: 'layout', data: { section: 'Users' } },
      { id: 'page:/users/[id]', kind: 'page', data: { name: 'User 42' } }
    ])
  })

  test('hostile loader data cannot break out of the payload script', async () => {
    const html = await (await get(make(), '/users/xss')).text()
    expect(html.match(/<\/script>/g)?.length).toBe(2)
    expect(html).toContain('&lt;/script&gt;&lt;img')
    expect(payloadOf(html).chain[2]?.data).toEqual({ name: '</script><img src=x onerror=alert(1)>' })
  })

  test('omits scripts when no entry is configured', async () => {
    const html = await (await get(make({ entry: undefined }), '/')).text()
    expect(html).not.toContain('<script')
  })

  test('does not duplicate a doctype rendered by the layout', async () => {
    const custom = createDocumentHandler<null>({
      routes: [{ id: 'page:/', pattern: '/', layouts: ['layout:/'] }],
      components: new Map<string, AnyRouteComponent>([
        ['layout:/', (props: LayoutProps) => [raw('<!doctype html>'), <html><body>{props.children}</body></html>]],
        ['page:/', Home]
      ]),
      hooks: new Map()
    })
    const html = await (await get(custom, '/')).text()
    expect(html.match(/<!doctype/gi)?.length).toBe(1)
  })
})

describe('non-document outcomes', () => {
  test('redirects with status and location and no body', async () => {
    const response = await get(make(), '/admin')
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toBe('/login')
    expect(await response.text()).toBe('')
  })

  test('renders 404, 403 and 400 documents without scripts', async () => {
    const handler = make()
    for (const [path, status] of [['/nope', 404], ['/users/404', 404], ['/vip', 403], ['/users/%E0%A4%A', 400]] as const) {
      const response = await get(handler, path)
      const html = await response.text()
      expect(response.status).toBe(status)
      expect(html.startsWith('<!doctype html>')).toBe(true)
      expect(html).not.toContain('<script')
    }
    expect(await (await get(handler, '/vip')).text()).toContain('members only')
  })

  test('answers 405 for other methods and bodyless HEAD for documents', async () => {
    const handler = make()
    const post = await get(handler, '/', 'POST')
    expect(post.status).toBe(405)
    expect(post.headers.get('allow')).toBe('GET, HEAD')
    const head = await get(handler, '/', 'HEAD')
    expect(head.status).toBe(200)
    expect(head.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(await head.text()).toBe('')
  })
})

describe('errors', () => {
  test('hides error details in production and shows them in development', async () => {
    const spy = spyOn(console, 'error').mockImplementation(() => { })
    const production = await get(make(), '/boom')
    const productionHtml = await production.text()
    expect(production.status).toBe(500)
    expect(productionHtml).not.toContain('secret failure')
    expect(productionHtml).not.toContain('<script')
    const development = await (await get(make({ development: true }), '/boom')).text()
    expect(development).toContain('secret failure')
    expect(spy).toHaveBeenCalled()
    spy.mockRestore()
  })

  test('a layout without a body cannot receive the hydration scripts', async () => {
    const spy = spyOn(console, 'error').mockImplementation(() => { })
    const custom = createDocumentHandler<null>({
      routes: [{ id: 'page:/', pattern: '/', layouts: ['layout:/'] }],
      components: new Map<string, AnyRouteComponent>([
        ['layout:/', (props: LayoutProps) => <html>{props.children}</html>],
        ['page:/', Home]
      ]),
      hooks: new Map(),
      entry: '/e.js',
      development: true
    })
    const response = await get(custom, '/')
    expect(response.status).toBe(500)
    expect(await response.text()).toContain('<body>')
    spy.mockRestore()
  })

  test('fails at creation when a route has no component', () => {
    expect(() => createDocumentHandler<null>({ routes, components: new Map(), hooks: new Map() })).toThrow('No component registered')
  })
})