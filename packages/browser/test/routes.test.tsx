/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { signal } from '@gambrel/reactivity'
import {
  composeRoute,
  createMatcher,
  createPayload,
  HydrationPayloadError,
  resolve,
  serializePayload,
  type AnyRouteComponent,
  type EntryHooks,
  type LayoutProps,
  type PageProps,
  type ParamsOf,
  type RouteParams,
  type RouteRecord
} from '@gambrel/router'
import { renderToString, type Child } from '@gambrel/view'
import { hydrateRoutes, type HydrationMismatch } from '../src/index.ts'
import { createPage } from './dom.ts'

function Counter(): Child {
  const count = signal(0)
  return (
    <button type="button" onClick={() => count.update((n) => n + 1)}>
      Clicked {count} times
    </button>
  )
}

function RootLayout(props: LayoutProps<RouteParams, null>): Child {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>Test</title>
      </head>
      <body>
        <nav>
          <a href="/">Home</a>
        </nav>
        <main>{props.children}</main>
      </body>
    </html>
  )
}

function UsersLayout(props: LayoutProps<RouteParams, { total: number }>): Child {
  return (
    <section>
      <p>{props.data.total} users</p>
      {props.children}
    </section>
  )
}

function UserPage(props: PageProps<ParamsOf<'/users/[id]'>, { name: string }>): Child {
  return (
    <article>
      <h1>{props.data.name}</h1>
      <p>#{props.params.id}</p>
      <Counter />
    </article>
  )
}

const routes: RouteRecord[] = [
  { id: 'page:/users/[id]', pattern: '/users/[id]', layouts: ['layout:/', 'layout:/users'] }
]

const components = new Map<string, AnyRouteComponent>([
  ['layout:/', RootLayout],
  ['layout:/users', UsersLayout],
  ['page:/users/[id]', UserPage]
])

const hooks = new Map<string, EntryHooks<null>>([
  ['layout:/users', { loader: () => ({ total: 3 }) }],
  ['page:/users/[id]', { loader: () => ({ name: 'Ada' }) }]
])

async function serverHtml(pathname: string): Promise<string> {
  const resolution = await resolve(createMatcher(routes), hooks, { pathname, context: null })
  if (resolution.kind !== 'page') throw new Error(`Unexpected ${resolution.kind}`)
  const body = await renderToString(composeRoute(resolution.chain, components, resolution.params))
  const payload =
    `<script type="application/json" id="gambrel-data" data-gambrel="payload">` +
    `${serializePayload(createPayload(resolution))}</script>`
  const entry = '<script type="module" src="/entry.js" data-gambrel="entry"></script>'
  return `<!doctype html>${body.replace('</body>', () => `${payload}${entry}</body>`)}`
}

const URL_1 = 'http://localhost/users/1'

describe('hydrateRoutes', () => {
  test('hydrates the document with the same tree and data and keeps the server DOM', async () => {
    const page = createPage(await serverHtml('/users/1'), URL_1)
    const h1 = page.document.querySelector('h1')
    const button = page.document.querySelector('button')
    const found: HydrationMismatch[] = []
    const result = hydrateRoutes({ routes, components, document: page.document, onMismatch: (m) => void found.push(m) })
    expect(found).toEqual([])
    expect(result.mismatches).toEqual([])
    expect(page.document.querySelector('h1')).toBe(h1)
    expect(page.document.querySelector('button')).toBe(button)
    expect(h1?.textContent).toBe('Ada')
    expect(page.document.querySelector('section p')?.textContent).toBe('3 users')
    expect(page.document.querySelectorAll('[data-gambrel]').length).toBe(2)
    if (button === null) throw new Error('Button missing')
    page.click(button)
    expect(button.textContent).toBe('Clicked 1 times')
  })

  test('rejects missing, malformed, unsupported and inconsistent payloads', async () => {
    const html = await serverHtml('/users/1')
    const attempts: Array<[string, () => void]> = [
      [
        'missing',
        () => hydrateRoutes({
          routes,
          components,
          document: createPage(html.replace(/<script type="application\/json"[\s\S]*?<\/script>/, ''), URL_1).document
        })
      ],
      [
        'invalid JSON',
        () => hydrateRoutes({
          routes,
          components,
          document: createPage(html.replace('"version":1', '"version":'), URL_1).document
        })
      ],
      [
        'unsupported version',
        () => hydrateRoutes({
          routes,
          components,
          document: createPage(html.replace('"version":1', '"version":2'), URL_1).document
        })
      ],
      [
        'unknown route',
        () => hydrateRoutes({ routes: [], components, document: createPage(html, URL_1).document })
      ],
      [
        'wrong page',
        () => hydrateRoutes({ routes, components, document: createPage(html, URL_1).document, pathname: '/users/2' })
      ]
    ]
    for (const [label, attempt] of attempts) {
      expect(attempt, label).toThrow(HydrationPayloadError)
    }
  })

  test('reports a deliberate mismatch, repairs it locally and keeps the rest', async () => {
    const html = (await serverHtml('/users/1')).replace('<h1>Ada</h1>', '<h1>Eve</h1>')
    const page = createPage(html, URL_1)
    const button = page.document.querySelector('button')
    const found: HydrationMismatch[] = []
    hydrateRoutes({ routes, components, document: page.document, onMismatch: (m) => void found.push(m) })
    expect(found.length).toBe(1)
    expect(found[0]?.message).toContain('text expected')
    expect(found[0]?.path).toContain('h1')
    expect(page.document.querySelector('h1')?.textContent).toBe('Ada')
    expect(page.document.querySelector('button')).toBe(button)
  })
})