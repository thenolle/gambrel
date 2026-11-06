# @gambrel/core and @gambrel/bun

## Application

`createApp({ development? })` returns an `App`. Register routes with `get`, `post`, `put`, `patch`, `delete`, `options` or `route(method, path, handler)`. Every method returns the app for chaining. `app.fetch(request)` is the only server interface.

## Paths

- Static segments and `:name` parameters. Parameter names match `[A-Za-z_][A-Za-z0-9_]*` and must be unique per route.
- Trailing and doubled slashes are ignored. The query string is never matched.
- The path is percent-decoded segment by segment before matching. Malformed encoding returns 400.
- Where two routes match the same URL, the first position at which they differ decides: static beats param.
- Routes with the same method and shape throw at registration.

## Handlers and results

A handler receives `{ request, url, method, params }` and returns a `Response` or a string. Strings become `text/plain; charset=utf-8`. Any other return value is a `TypeError` that produces a 500. Helpers: `text`, `html`, `json`, `redirect`.

## Responses for non-matches

- Path matches but method does not: 405 with an `Allow` header.
- Nothing matches: 404 from `notFound` (default plain text).

## Middleware

`use((ctx, next) => ...)`, executed in registration order, outermost first, around every request including 400, 404 and 405 responses. Calling `next()` twice throws.

## Errors

Thrown errors go to `onError`. The default logs the error and returns `Internal Server Error`, or the stack when `development: true`.

## Not implemented yet

Automatic HEAD and OPTIONS handling, static file serving (Phase 8).

## Bun adapter

`serve(app, { port?, hostname?, development? })` calls `Bun.serve` and returns `{ url, stop(closeActiveConnections?) }`. It has no routing or rendering logic.