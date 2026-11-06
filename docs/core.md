# @gambrel/core

The server application layer: routes, request context, middleware and response helpers. It works with the standard `Request` and `Response`, so it does not depend on Bun, JSX or the DOM. Pair it with [@gambrel/bun](./bun.md) to serve it.

## Quick example

```ts
import { createApp, json } from '@gambrel/core'

const app = createApp()
  .get('/', () => 'Hello')
  .get('/users/:id', (ctx) => json({ id: ctx.params.id }))

const response = await app.fetch(new Request('http://localhost/users/42'))
console.log(await response.json()) // { id: '42' }
```

Every registration method returns the app, so calls chain.

## createApp

```ts
createApp(options?: { development?: boolean }): App
```

`development` (default `false`) makes the default 500 response include the error stack. Leave it off in production.

## Registering routes

| Method                                             | Meaning                                            |
| -------------------------------------------------- | -------------------------------------------------- |
| `get`, `post`, `put`, `patch`, `delete`, `options` | Register a handler for that method and path        |
| `route(method, path, handler)`                     | The same with the method as an argument            |
| `use(middleware)`                                  | Add middleware                                     |
| `notFound(handler)`                                | Handle requests that no route matched              |
| `onError(handler)`                                 | Handle errors thrown by handlers                   |
| `fetch(request)`                                   | Process a `Request`, returns a `Promise<Response>` |

Paths start with `/` and use `:name` for parameters. Names match `[A-Za-z_][A-Za-z0-9_]*` and must be unique within a path. Params are typed from the path literal:

```ts
app.get('/users/:id/posts/:postId', (ctx) => {
  return `${ctx.params.id} / ${ctx.params.postId}` // both are strings
})
```

> [!NOTE]
> Core paths use `:id`. File routes use `[id]` folder names. They are different systems: core serves your API routes, file routes serve pages.

Registering two routes with the same method and shape (for example `/a/:x` and `/a/:y`) throws immediately.

## Matching rules

- A trailing slash or doubled slash is ignored. The query string is never matched.
- Where several routes match, the first segment at which they differ decides: a static segment beats a parameter.
- Paths are percent-decoded per segment. Malformed encoding answers `400`.
- If the path matches a route but the method does not, the answer is `405` with an `Allow` header.
- If nothing matches, the `notFound` handler answers (default: plain-text `404`).

## The context

| Field     | Type         | Meaning                 |
| --------- | ------------ | ----------------------- |
| `request` | `Request`    | The incoming request    |
| `url`     | `URL`        | The parsed request URL  |
| `method`  | `string`     | Upper-case method       |
| `params`  | typed record | Decoded path parameters |

## What a handler returns

| Return value                          | Response                               |
| ------------------------------------- | -------------------------------------- |
| A `Response`                          | Used as it is                          |
| A string                              | `200` with `text/plain; charset=utf-8` |
| A promise of either                   | Awaited                                |
| Anything else (including `undefined`) | A `TypeError`, answered as a 500       |

## Response helpers

| Helper                             | Result                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `text(body, init?)`                | `text/plain; charset=utf-8`                                                 |
| `html(body, init?)`                | `text/html; charset=utf-8`. The body is sent as it is.                      |
| `json(data, init?)`                | `application/json; charset=utf-8`. Throws for values JSON cannot represent. |
| `redirect(location, status = 302)` | A bodyless redirect. Status 301, 302, 303, 307 or 308.                      |

A `content-type` you pass in `init.headers` is kept.

## Middleware

```ts
app.use(async (ctx, next) => {
  const started = performance.now()
  const response = await next()
  console.log(`${ctx.method} ${ctx.url.pathname} ${response.status} ${(performance.now() - started).toFixed(1)}ms`)
  return response
})
```

- Middleware runs in registration order, outermost first, around **every** request, including 400, 404 and 405 responses.
- Return a response without calling `next()` to short-circuit.
- Calling `next()` twice is an error.

## Errors

A throw in a handler or middleware goes to `onError(error, ctx)`. The default logs the error with `console.error` and answers `500 Internal Server Error`, or the stack when `development` is `true`. If your error handler throws, the answer is a plain 500.

```ts
app.onError((error) => json({ error: 'Something went wrong' }, { status: 500 }))
```

## Not included

Automatic `HEAD` and `OPTIONS` answers for explicit routes, cookies, body parsing helpers and sessions. Read the body from `ctx.request` with the standard `request.json()` and friends.