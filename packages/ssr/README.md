# @gambrel/ssr

Document request handling for Gambrel applications.

## Install

```bash
bun add @gambrel/ssr @gambrel/router @gambrel/view
```

## Create a document handler

```ts
import { createDocumentHandler } from '@gambrel/ssr'
import { components, hooks, routes } from './.gambrel/manifest.server.ts'

const documents = createDocumentHandler({
  routes,
  components,
  hooks,
  entry: '/assets/client.js'
})

const response = await documents.handle(request, context)
```

`request` and `context` are supplied by your HTTP application.

## Request lifecycle

1. Match the route.
2. Run guards and loaders.
3. Compose layouts and the page.
4. Render HTML.
5. Embed hydration data and a browser entry when configured.
6. Return the appropriate HTTP response.

## Server-only rendering

Omit `entry` to render documents without hydration data or client scripts.

## Errors

Unmatched routes return 404. Redirects preserve their status and location. Error documents do not hydrate.

Use `renderError` to customize error documents. Error details are exposed only when `development` is enabled.

## Documentation

[SSR reference](https://thenolle.github.io/gambrel/#/ssr)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.