# @gambrel/bun

The adapter between a [core](./core.md) application and `Bun.serve`, plus static file serving. It has no routing and no rendering logic.

## serve

```ts
import { serve } from '@gambrel/bun'
import { createApp } from '@gambrel/core'

const app = createApp().get('/', () => 'Hello')
const server = serve(app, { port: 3000 })

console.log(server.url.href)
await server.stop()
```

```ts
serve(app: { fetch(request: Request): Promise<Response> }, options?: ServeOptions): ServerHandle
```

| Option        | Default       | Meaning                                                                                                 |
| ------------- | ------------- | ------------------------------------------------------------------------------------------------------- |
| `port`        | `3000`        | TCP port. Use `0` to let the system pick a free one.                                                    |
| `hostname`    | Bun's default | Interface to bind.                                                                                      |
| `development` | `false`       | Bun's development mode (richer error pages). Independent of the application's own `development` option. |

`ServerHandle` has two members:

| Member                          | Meaning                                                                |
| ------------------------------- | ---------------------------------------------------------------------- |
| `url`                           | A `URL` with the real address, including the port chosen for `port: 0` |
| `stop(closeActiveConnections?)` | Stops the server; resolves when done                                   |

## staticFiles

A core middleware that serves a directory under a URL prefix.

```ts
import { staticFiles } from '@gambrel/bun'

app.use(staticFiles({ directory: 'dist/client', prefix: '/assets' }))
```

| Request                                                       | Answer                                                      |
| ------------------------------------------------------------- | ----------------------------------------------------------- |
| `GET` or `HEAD` for a file under the prefix                   | The file, with a content type and `cache-control: no-cache` |
| A missing file, a directory, or a path escaping the directory | Plain-text `404 Not Found`                                  |
| Malformed percent-encoding                                    | Plain-text `400 Bad Request`                                |
| Another method, or a path outside the prefix                  | Passed on to the next handler                               |

Requests under the prefix **never** fall through to your page handler. That is deliberate: a missing script must produce a `404`, not an HTML page that a browser rejects as a script.

A prefix of `/` serves a whole directory, as the documentation site does.