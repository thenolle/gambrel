# Errors and 404 pages

Gambrel answers every request with a response whose status you can predict. Error responses are complete HTML documents that never carry the hydration payload or scripts, so they are never hydrated as a page.

## What produces what

| Situation                                             | Status                             | Where it comes from |
| ----------------------------------------------------- | ---------------------------------- | ------------------- |
| No route matches                                      | 404                                | The router          |
| A loader or guard returns `notFound()`                | 404                                | Your code           |
| A guard or loader returns `deny(status, message)`     | the status you chose               | Your code           |
| Malformed percent-encoding in the path                | 400                                | The framework       |
| A method other than GET or HEAD on a page             | 405 with `Allow: GET, HEAD`        | The framework       |
| A thrown error, invalid loader data, a render failure | 500                                | The framework       |
| Redirects                                             | 301, 302, 303, 307 or 308, no body | Your code           |

> [!NOTE]
> In the example app, core handles the request first. A malformed path such as `/users/%E0%A4%A` is answered by core with a plain-text `400 Bad Request` before the page handler sees it.

## Production and development

Error details stay on the server in production. In development, the 500 page shows the error and its stack, and bad-request pages show the reason.

|               | Production                                       | Development              |
| ------------- | ------------------------------------------------ | ------------------------ |
| 500 page body | Status and title only                            | Includes the error stack |
| Server log    | The error is always written with `console.error` | The same                 |

The example server turns development on only when `NODE_ENV=development`. `bun run dev` sets it for you. Any other value, including an unset variable, behaves as production.

## Customize the error document

Pass `renderError` to `createDocumentHandler`. It receives the status and returns a complete document:

```tsx title="src/error-page.tsx"
/** @jsxImportSource @gambrel/view */
import type { ErrorInfo } from '@gambrel/ssr'
import type { Child } from '@gambrel/view'

export function renderError(info: ErrorInfo): Child {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>{`${info.status} ${info.statusText}`}</title>
      </head>
      <body>
        <h1>{info.status === 404 ? 'We could not find that page' : info.statusText}</h1>
        {info.message === undefined ? null : <p>{info.message}</p>}
        <a href="/">Back to the home page</a>
      </body>
    </html>
  )
}
```

```ts title="src/app.ts"
import { renderError } from './error-page.tsx'

const documents = createDocumentHandler<Context>({
  routes,
  components,
  hooks,
  entry: options.entry,
  development: options.development,
  renderError
})
```

`ErrorInfo` has four fields:

| Field        | Meaning                                                            |
| ------------ | ------------------------------------------------------------------ |
| `status`     | The HTTP status.                                                   |
| `statusText` | A short name such as `Not Found`.                                  |
| `message`    | A safe message, set for denials and (in development) bad requests. |
| `error`      | The underlying error. **Only set in development.**                 |

If `renderError` itself throws, the response falls back to a plain-text `status statusText`, and the failure is logged.

## API routes

For routes registered on the core application, use core's own hooks:

```ts
app.onError((error) => json({ error: 'Something went wrong' }, { status: 500 }))
app.notFound((ctx) => documents.handle(ctx.request, ctx))
```

`createApp({ development: true })` makes core's default 500 body include the error. A handler that returns something other than a `Response` or a string is also a 500.

See [Troubleshooting](./troubleshooting.md) for specific messages.