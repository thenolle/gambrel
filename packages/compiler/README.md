# @gambrel/compiler

File-route discovery, generated manifests, and application builds for Bun.

## Install

```bash
bun add @gambrel/compiler
```

## Build an application

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

The default entries are `src/server.ts` and `src/client.ts`. Routes are discovered under `src/routes`.

## Route files

- `page.tsx`: a page component
- `layout.tsx`: an inherited layout
- `page.server.ts`: page loader and guard
- `layout.server.ts`: layout loader and guard

Dynamic folders use `[id]` and `[...slug]`. Groups use `(name)`. Underscore-prefixed and dot-prefixed folders are excluded.

## Generated output

`.gambrel` contains separate server and client manifests.

The browser manifest imports components only. The client build rejects server-only module imports.

A full build writes server and browser bundles plus build metadata. It clears the configured output directory before building.

## Programmatic API

- `discoverRoutes`
- `buildRouteTable`
- `generateRoutes`
- `generateModules`
- `writeModules`
- `buildClient`
- `buildApp`
- `defineConfig`
- `loadConfig`

## Documentation

[Compiler reference](https://thenolle.github.io/gambrel/#/compiler)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.