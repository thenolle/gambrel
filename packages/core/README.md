# @gambrel/core

A small HTTP application layer built on standard Request and Response objects.

## Install

```bash
bun add @gambrel/core
```

## Create an application

```ts
import { createApp, json } from '@gambrel/core'

const app = createApp()
  .get('/', () => 'Hello')
  .get('/users/:id', ({ params }) => json({ id: params.id }))

const response = await app.fetch(
  new Request('http://localhost/users/42')
)
```

Use `@gambrel/bun` to serve the application with Bun.

## API

- `createApp(options?)`: create the application
- `get`, `post`, `put`, `patch`, `delete`, `options`, `route`: register handlers
- `use`: register middleware
- `notFound`: handle unmatched requests
- `onError`: handle thrown errors
- `fetch`: process a request

Handlers return a Response, a string, or a promise of either.

Response helpers: `text`, `html`, `json`, and `redirect`. Explicit status codes and headers are preserved.

## Middleware

```ts
app.use(async (context, next) => {
  const response = await next()
  response.headers.set('x-content-type-options', 'nosniff')
  return response
})
```

Middleware surrounds every request. Return a response directly to stop the chain.

## Routing

Core route parameters use `:id`. Static segments take precedence over parameters. Unmatched methods receive 405 with an Allow header; unmatched paths receive 404.

Core routing is separate from the file-route conventions in `@gambrel/router`.

## Documentation

[Core reference](https://thenolle.github.io/gambrel/#/core)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.