# @gambrel/ssr

Turns a request into a rendered HTML document: resolve the route, render the layout chain, embed the hydration payload, and answer with the right status. It depends only on the router and the view packages, not on core or Bun.

## createDocumentHandler

```ts
import { createDocumentHandler } from '@gambrel/ssr'
import { components, hooks, routes } from '../.gambrel/manifest.server.ts'

const documents = createDocumentHandler<Context>({
  routes,
  components,
  hooks,
  entry: '/assets/client.js',
  development: false
})

const response = await documents.handle(request, context)
```

| Option        | Required | Meaning                                                                                   |
| ------------- | -------- | ----------------------------------------------------------------------------------------- |
| `routes`      | yes      | Route records, from the generated manifest                                                |
| `components`  | yes      | Page and layout components by entry id                                                    |
| `hooks`       | yes      | Guards and loaders by entry id                                                            |
| `entry`       | no       | URL of the browser script. Without it, pages are rendered with no payload and no scripts. |
| `development` | no       | Show error details in error documents. Default `false`.                                   |
| `renderError` | no       | Render error documents. See [Errors and 404 pages](./error-pages.md).                     |

It throws `RouteConfigError` at creation if a route has no registered component, so a misconfigured server fails at startup, not on the first request.

`handle(request, context)` passes `context` to every guard and loader. In the example app it is core's `Context`.

## What it answers

| Situation                        | Response                                                          |
| -------------------------------- | ----------------------------------------------------------------- |
| A page                           | `200`, `text/html; charset=utf-8`                                 |
| `HEAD` on a page                 | The same status and headers, no body                              |
| A redirect                       | Its status and `location`, no body                                |
| Denied, not found, bad request   | The error document with that status                               |
| A method other than GET and HEAD | `405` with `Allow: GET, HEAD`                                     |
| An error                         | A `500` error document. The error is logged with `console.error`. |

## What a page contains

1. The component tree, from `composeRoute`, rendered with `renderToString`.
2. `<!doctype html>` prepended if the layout did not render one.
3. When `entry` is set: a JSON payload script and a module script, inserted just before `</body>` and marked `data-gambrel`.

The root layout must render a `<body>`. Without one the response is a `500` that says so.

Error documents carry no payload and no scripts.

## Wiring it into core

The handler fits `notFound`, so every request that no explicit core route matched becomes a page request:

```ts title="src/app.ts"
export function createApplication(options: ApplicationOptions): App {
  const documents = createDocumentHandler<Context>({ routes, components, hooks, entry: options.entry, development: options.development })
  return createApp({ development: options.development })
    .use(staticFiles({ directory: options.clientDir, prefix: '/assets' }))
    .get('/api/health', () => json({ ok: true }))
    .notFound((ctx) => documents.handle(ctx.request, ctx))
}
```

## Exports

| Export                     | Use                                                            |
| -------------------------- | -------------------------------------------------------------- |
| `createDocumentHandler`    | The handler                                                    |
| `renderDefaultError(info)` | The default error document, reusable in your own `renderError` |
| `statusText(status)`       | `Not Found` for `404`, and so on                               |

Types: `DocumentHandler`, `DocumentHandlerOptions`, `ErrorInfo` (`status`, `statusText`, `message`, `error`).