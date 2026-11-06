# Configuration

Gambrel needs no configuration for the standard layout. When you do need it, there are two places: an optional config file and a few environment variables.

## gambrel.config.ts

Create the file at the project root. Every option is optional.

```ts title="gambrel.config.ts"
import { defineConfig } from '@gambrel/compiler'

export default defineConfig({
  routesDir: 'src/routes',
  serverEntry: 'src/server.ts',
  clientEntry: 'src/client.ts',
  outDir: 'dist',
  sourcemap: true,
  minify: true
})
```

| Option        | Default                                      | Meaning                                       |
| ------------- | -------------------------------------------- | --------------------------------------------- |
| `routesDir`   | `src/routes`                                 | Where `page.tsx` and `layout.tsx` files live. |
| `serverEntry` | `src/server.ts`                              | Entry of the server bundle.                   |
| `clientEntry` | `src/client.ts`                              | Entry of the browser bundle.                  |
| `outDir`      | `dist`                                       | Build output. It is emptied by a full build.  |
| `sourcemap`   | `true`                                       | Write external source maps.                   |
| `minify`      | `true` in production, `false` in development | Minify both bundles.                          |

Paths are relative to the project root. Unknown options and wrong types are errors that list every problem. The build target is always Bun, and the generated manifests always go to `.gambrel/`.

> [!WARNING]
> `outDir` must not be the project root or contain it. The build refuses, because it deletes the output directory first.

## Environment variables

These are read by the example server (`src/server.ts`) and the scripts.

| Variable             | Default       | Meaning                                                                                        |
| -------------------- | ------------- | ---------------------------------------------------------------------------------------------- |
| `NODE_ENV`           | unset         | `development` shows error details. `bun run dev` sets it. Anything else behaves as production. |
| `PORT`               | `3000`        | The port to listen on. Must be an integer.                                                     |
| `GAMBREL_CLIENT_DIR` | `dist/client` | Directory of the browser assets, relative to the working directory.                            |
| `DOCS_PORT`          | `4000`        | Port of `bun run docs`.                                                                        |

## Use the build from code

The same operations are available programmatically from `@gambrel/compiler`:

```ts
import { buildApp, buildClient, generateRoutes, loadConfig } from '@gambrel/compiler'

const root = process.cwd()
const config = await loadConfig(root)

await generateRoutes({ root })                                   // manifests only
await buildClient({ root, config, mode: 'development' })         // browser bundle only
const result = await buildApp({ root, config, mode: 'production' }) // everything
console.log(result.outputs)
```

`result.outputs` lists every file in the output directory.

## Scripts

| Script (in the app) | Does                                                                            |
| ------------------- | ------------------------------------------------------------------------------- |
| `generate`          | Writes `.gambrel/` from the route files.                                        |
| `dev`               | Builds the browser bundle in development mode, watches `src/`, runs the server. |
| `build`             | A full production build.                                                        |
| `start`             | Runs `dist/server/index.js` with `NODE_ENV=production`.                         |

See [Build and development](./build.md) for the output layout and [Compiler](./compiler.md) for route conventions.