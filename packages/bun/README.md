# @gambrel/bun

Bun server integration and static-file middleware for Gambrel.

## Install

```bash
bun add @gambrel/bun @gambrel/core
```

## Serve an application

```ts
import { serve } from '@gambrel/bun'
import { createApp } from '@gambrel/core'

const app = createApp().get('/', () => 'Hello')
const server = serve(app, { port: 3000 })

console.log(server.url.href)
```

`serve` accepts `port`, `hostname`, and `development`. Use port 0 to request an available port.

Call `await server.stop()` to stop the server.

## Serve static files

```ts
import { staticFiles } from '@gambrel/bun'

app.use(staticFiles({
  directory: 'dist/client',
  prefix: '/assets'
}))
```

GET and HEAD requests under the prefix serve files from the directory. Missing files return a plain-text 404 rather than falling through to an HTML page.

Keep the served directory limited to public assets. Do not place credentials or private data inside it.

## Runtime

Bun.

## Documentation

[Bun adapter reference](https://thenolle.github.io/gambrel/#/bun)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.