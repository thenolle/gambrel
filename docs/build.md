# Build and development workflow

## Commands (from the repository root)

| Command             | What it does                                                                                                                                    |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `bun install`       | Installs and links the workspace.                                                                                                               |
| `bun run typecheck` | Regenerates route manifests, then type-checks every package and the example.                                                                    |
| `bun test`          | Runs all tests, including the build and end-to-end tests.                                                                                       |
| `bun run build`     | Production build of the example into `examples/app/dist`.                                                                                       |
| `bun run start`     | Runs the built server (`NODE_ENV=production`). Build first.                                                                                     |
| `bun run dev`       | Builds the client in development mode, watches `src/` to rebuild it, restarts the server on server-side changes. Reload the page after changes. It sets `NODE_ENV=development`; every other value, including unset, behaves as production for error detail. |

## Configuration (`gambrel.config.ts`, optional)

`routesDir` (`src/routes`), `serverEntry` (`src/server.ts`), `clientEntry` (`src/client.ts`), `outDir` (`dist`), `sourcemap` (true), `minify` (true in production). Unknown keys are errors. The runtime target is Bun.

## Output

```text
dist/
├── client/
│   ├── client.js        browser entry, served at /assets/client.js
│   └── client.js.map
├── server/
│   ├── index.js         production server entry
│   └── index.js.map
└── manifest/
    ├── build.json       mode, target, entries and file lists
    └── routes.json      route records (id, pattern, layouts)
```

`buildApp` empties `outDir` first and refuses an `outDir` that is the project root or contains it. Output is deterministic: no timestamps, sorted file lists.

## Server code never reaches the browser

The browser and server bundles are built from separate entry graphs. The client build fails, naming the importer, if its graph reaches a `*.server.ts` file, `@gambrel/ssr`, `@gambrel/bun`, `@gambrel/core`, `@gambrel/compiler`, or a `bun:` or `node:` module. This does not rely on tree-shaking.

## Static assets (`@gambrel/bun`)

`staticFiles({ directory, prefix })` is a core middleware. Under the prefix, GET and HEAD are answered from the directory; a missing file, a directory or a path outside it is a plain-text 404 (never the HTML document handler). Responses use `cache-control: no-cache`.

## Development limitations

No HMR. Adding or removing route files regenerates the manifests and restarts the server through `bun --watch`; the browser must be reloaded manually.