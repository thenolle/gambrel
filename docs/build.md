# Build output

Gambrel builds server and browser code from separate entry graphs and records the resulting artifacts.

## Programmatic build

```ts
import { buildApp, loadConfig } from '@gambrel/compiler'

const root = process.cwd()

const result = await buildApp({
  root,
  config: await loadConfig(root),
  mode: 'production'
})

console.log(result.outputs)
```

Your package scripts can call this build script. Script names belong to the application, not to the runtime itself.

## Configuration

```ts title="gambrel.config.ts"
import { defineConfig } from '@gambrel/compiler'

export default defineConfig({
  routesDir: 'src/routes',
  serverEntry: 'src/server.ts',
  clientEntry: 'src/client.ts',
  outDir: 'dist'
})
```

Additional options control source maps and minification. See [Configuration](./configuration.md).

## Generated route modules

Before bundling, route discovery writes:

```text
.gambrel/
├── routes.ts
├── manifest.client.ts
└── manifest.server.ts
```

These files are generated from route sources and should not be edited manually.

The client manifest imports components. The server manifest imports components and server hook modules.

## Production artifacts

With the default client entry name, the output is:

```text
dist/
├── client/
│   ├── client.js
│   └── client.js.map
├── server/
│   ├── index.js
│   └── index.js.map
└── manifest/
    ├── build.json
    └── routes.json
```

Source-map files depend on configuration. Additional imported assets can add output files.

The browser entry filename follows the configured client entry's base name. The server entry is emitted as `server/index.js`.

`build.json` records the build mode, runtime target, entry files and output lists. `routes.json` records route metadata.

A full build clears the configured output directory first. Do not point it at a directory containing application source or data.

## Browser build boundary

The client build rejects imports of:

- Recognized `*.server` modules
- `@gambrel/core`
- `@gambrel/bun`
- `@gambrel/ssr`
- `@gambrel/compiler`
- `node:` and `bun:` modules

This prevents those import graphs from entering the browser bundle. It does not inspect arbitrary application objects for secrets.

Every value returned by a loader is public data once embedded in the page.

## Serving browser assets

The server must serve the emitted browser directory at the URL used in its document handler:

```ts
app.use(staticFiles({
  directory: 'dist/client',
  prefix: '/assets'
}))
```

```ts
createDocumentHandler({
  routes,
  components,
  hooks,
  entry: '/assets/client.js'
})
```

The file path and script URL must agree.

A missing asset should return a plain-text 404, not fall through to a document response.

## Development rebuilds

`buildClient` regenerates manifests and builds only the browser output.

```ts
await buildClient({
  root,
  config,
  mode: 'development'
})
```

Applications can invoke it from a watcher. Watch behavior is provided by the application script; there is no universal compiler-owned HMR server.

The repository example uses a watcher and Bun's process restart behavior. Restart that development command after adding or removing route files if the route table is not refreshed. Reload the browser after a successful client rebuild.

## Repository commands

In the Gambrel repository:

| Command              | Application                                  |
| -------------------- | -------------------------------------------- |
| `bun run dev`        | File-routing example in development          |
| `bun run build`      | Production build of the file-routing example |
| `bun run start`      | Start that built example                     |
| `bun run docs:build` | Build the static documentation website       |

The rendering-mode examples have their own commands. See [Rendering examples](./examples.md).

## Related

- [Compiler reference](./compiler.md)
- [Application structure](./development.md)
- [Deployment](./deployment.md)