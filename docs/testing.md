# Testing your app

Gambrel apps are tested with `bun test`. The framework is built so most tests need no browser and no network.

```bash
bun test                  # everything
bun test examples/app     # one folder
```

## Test an API handler

An application's `fetch` takes a standard `Request` and returns a `Response`:

```ts title="src/api.test.ts"
import { expect, test } from 'bun:test'
import { createApp, json } from '@gambrel/core'

test('health route', async () => {
  const app = createApp().get('/api/health', () => json({ ok: true }))
  const response = await app.fetch(new Request('http://localhost/api/health'))
  expect(response.status).toBe(200)
  expect(await response.json()).toEqual({ ok: true })
})
```

## Test a loader or a guard

Loaders and guards are plain functions. Call them with the context they expect:

```ts title="src/routes/books/[id]/page.server.test.ts"
import { expect, test } from 'bun:test'
import type { Context } from '@gambrel/core'
import { loader } from './page.server.ts'

function context(path: string): Context {
  const url = new URL(`http://localhost${path}`)
  return { request: new Request(url), url, method: 'GET', params: {} }
}

test('returns the requested book', async () => {
  const result = await loader({
    params: { id: '2' },
    pathname: '/books/2',
    search: '',
    context: context('/books/2')
  })
  expect(result).toEqual({ id: '2', title: 'The Pragmatic Programmer', author: 'Hunt and Thomas', year: 1999 })
})
```

> [!TIP]
> Only files named exactly `page.tsx`, `layout.tsx`, `page.server.ts` and `layout.server.ts` are routes. A file such as `page.server.test.ts` is ignored by the router and the build, so tests can live next to the code.

## Test the whole application over HTTP

Generate the route manifests, create the application, and serve it on a free port:

```ts title="test/http.test.ts"
import { afterAll, beforeAll, expect, test } from 'bun:test'
import { serve, type ServerHandle } from '@gambrel/bun'
import { generateRoutes } from '@gambrel/compiler'

let server: ServerHandle

beforeAll(async () => {
  await generateRoutes({ root: process.cwd() })
  const { createApplication } = await import('../src/app.ts')
  server = serve(createApplication({ development: false, entry: '/assets/client.js', clientDir: 'dist/client' }), {
    port: 0,
    hostname: '127.0.0.1'
  })
})

afterAll(async () => {
  await server.stop(true)
})

test('the home page is server-rendered', async () => {
  const response = await fetch(new URL('/', server.url))
  expect(response.status).toBe(200)
  expect(await response.text()).toContain('<h1>')
})
```

Use `port: 0` so tests never fight over a port. Import the application **after** `generateRoutes`, because the generated manifests must exist first.

## Test hydration without a browser

The repository's tests load server HTML into happy-dom and hydrate it, then check that nothing mismatched. The helper lives in `examples/app/test/support.ts`.

```ts
const { document, pathname } = await loadPage(server, '/users/1')
const client = await import('../.gambrel/manifest.client.ts')
const found: HydrationMismatch[] = []

hydrateRoutes({
  routes: client.routes,
  components: client.components,
  document,
  pathname,
  onMismatch: (mismatch) => void found.push(mismatch)
})

expect(found).toEqual([])
```

Add `happy-dom` as a development dependency of your app to do the same.

## What the repository tests

Looking at the existing tests is the quickest way to learn the patterns:

| Folder                                 | Covers                                                         |
| -------------------------------------- | -------------------------------------------------------------- |
| `packages/*/test`                      | Each package's public behavior                                 |
| `examples/app/test/e2e.test.ts`        | Pages over real HTTP, guards, hydration                        |
| `examples/app/test/hardening.test.ts`  | Malformed URLs, catch-all params, payload failures             |
| `examples/app/test/build.test.ts`      | Build output, determinism, server code kept out of the browser |
| `examples/app/test/production.test.ts` | The built server, run as a separate process                    |

## Real browsers

happy-dom is not a real browser. Before you ship, open the built app and check these by hand: the browser console is clean, `client.js` loads as JavaScript, interactive parts respond, and the page still reads with JavaScript disabled.