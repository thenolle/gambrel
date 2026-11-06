# Gambrel

A small TypeScript-first, JSX-based full-stack web framework for Bun: file-system routing with nested layouts, loaders and guards, server-side rendering, and browser hydration.

## Status

Prototype. The packages live in this monorepo and are not published (every package is `private`). They export TypeScript source and are used through Bun workspaces. No license has been chosen yet.

Runtime: Bun only. Developed and tested with Bun 1.4.4-canary.1 on Windows.

## Requirements

- Bun
- Git

## Setup and quick start

```bash
git clone [https://github.com/thenolle/gambrel.git](https://github.com/thenolle/gambrel.git)
cd gambrel
bun install
bun run typecheck
bun test
bun run build
bun run start      # http://localhost:3000
```

For development with automatic client rebuilds, run `bun run dev`, edit a file under `examples/app/src`, wait for "client rebuilt" in the terminal, then reload the page. There is no hot module replacement.

To make your own app, copy `examples/app` to a new directory under `examples/` (the workspace glob picks it up), rename the package in its `package.json`, and run `bun install`.

## Commands

| Command             | What it does                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `bun run typecheck` | Regenerates the example's route manifests and type-checks every package and the example. |
| `bun test`          | Runs every test, including the build, production-server and end-to-end tests.            |
| `bun run build`     | Production build of `examples/app` into `examples/app/dist`.                             |
| `bun run start`     | Runs the built server with `NODE_ENV=production`. Build first.                           |
| `bun run dev`       | Development server and client rebuilds. Sets `NODE_ENV=development`.                     |

## Application layout

```text
my-app/
├── gambrel.config.ts      optional
├── package.json
├── tsconfig.json
├── scripts/               generate, build and dev scripts (see examples/app)
└── src/
    ├── server.ts          creates the application and starts the server
    ├── app.ts             composes core, static files and the document handler
    ├── client.ts          browser entry: hydrateRoutes
    └── routes/
        ├── layout.tsx
        ├── page.tsx
        ├── about/page.tsx
        └── users/
            ├── layout.tsx
            ├── layout.server.ts
            └── [id]/
                ├── page.tsx
                └── page.server.ts
```

`gambrel.config.ts` may set `routesDir`, `serverEntry`, `clientEntry`, `outDir`, `sourcemap` and `minify`. Unknown keys are errors.

## Route conventions

| Path                                 | Meaning                                                                                       |
| ------------------------------------ | --------------------------------------------------------------------------------------------- |
| `page.tsx`                           | The page for its directory's URL. Default export is a `PageComponent`.                        |
| `layout.tsx`                         | Wraps every page below it, outermost first. Default export is a `LayoutComponent`.            |
| `page.server.ts`, `layout.server.ts` | Optional server-only module next to the component. May export only `loader` and `beforeLoad`. |
| `[id]`                               | Dynamic segment, a `string`.                                                                  |
| `[...slug]`                          | Catch-all, a `readonly string[]` with one or more segments. Must be last.                     |
| `(group)`                            | Groups routes and layouts without adding a URL segment.                                       |
| `_name`, `.name`                     | Directory ignored with its whole subtree.                                                     |

Static segments beat dynamic ones, which beat catch-alls, compared left to right. Trailing and doubled slashes are ignored and the query string is never matched. Route IDs look like `page:/users/[id]` and `layout:/users`. Invalid or ambiguous routes fail with an error naming the files.

## Pages and layouts

```tsx
/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function UserPage(props: PageProps<ParamsOf<'/users/[id]'>, LoaderData<typeof loader>>): Child {
  return <h1>{props.data.name}</h1>
}
```

Pages receive `{ params, data }`. Layouts also receive `children`. Each entry gets the data of its own loader, and an entry without a loader gets `null`. Route components are synchronous because the same component renders on the server and hydrates in the browser. Add the JSX pragma to every `.tsx` file: the bundler and test runner read it reliably.

Never import server-only code from `page.tsx` or `layout.tsx`. Importing the loader's type with `import type` is fine because it is erased.

## Loaders and guards

```ts
import { notFound, redirect, type Guard, type Loader, type ParamsOf } from '@gambrel/router'

export const beforeLoad: Guard<ParamsOf<'/admin'>, Context> = (ctx) =>
  ctx.context.request.headers.get('x-demo-user') === null ? redirect('/') : undefined

export const loader: Loader<ParamsOf<'/users/[id]'>, { name: string }, Context> = (ctx) =>
  findUser(ctx.params.id) ?? notFound()
```

Resolution order: match the route, run every guard from the outermost layout to the page, then run every loader in the same order. The first outcome stops everything. A guard returns nothing to continue, or `redirect(location, status?)`, `deny(status?, message?)` or `notFound()`. A loader returns JSON data (`null` for none) or one of those outcomes. Loader data must be plain JSON (`null`, booleans, strings, finite numbers, arrays, plain objects); anything else is an error that names the offending path. Hooks receive `{ params, pathname, search, context }`, where `context` is whatever the caller of the document handler passes (the core request context in the example).

## SSR and hydration

1. `@gambrel/ssr` resolves the route, composes the layout chain, and renders HTML. `<!doctype html>` is prepended when missing.
2. A versioned JSON payload (route id, pathname, params, per-entry data) and the browser entry script are inserted before `</body>`, both marked `data-gambrel`. The root layout must render a `<body>`.
3. The browser entry calls `hydrateRoutes`: it parses and validates the payload (unknown fields, wrong types, wrong version, or a payload that disagrees with the page all throw), rebuilds the same tree from the payload's params and data, and hydrates the existing DOM. Loaders and guards never run in the browser.
4. Matching DOM is kept. A mismatch is reported and repaired locally (one subtree, text node or attribute); see `docs/browser.md`.
5. On a payload error the server HTML stays untouched.

The payload JSON escapes `< > &` and U+2028 and U+2029, so loader data cannot close the script element. Redirects, 4xx and 5xx responses are not hydrated and contain no payload. Error details and stack traces appear only with `NODE_ENV=development`.

## Build output

```text
dist/
├── client/client.js (+ .map)     served at /assets/client.js
├── server/index.js (+ .map)
└── manifest/build.json, routes.json
```

The browser and server bundles are built from separate entry graphs. The client build fails if its graph reaches a `*.server.ts` file, `@gambrel/ssr`, `@gambrel/bun`, `@gambrel/core`, `@gambrel/compiler`, or a `bun:` or `node:` module. Output is deterministic.

## Packages

| Package               | Responsibility                                      | Depends on                     |
| --------------------- | --------------------------------------------------- | ------------------------------ |
| `@gambrel/core`       | Server app: routing, context, middleware, responses | nothing                        |
| `@gambrel/bun`        | `Bun.serve` adapter and static files                | `core`                         |
| `@gambrel/reactivity` | Signals, effects, batching, ownership               | nothing                        |
| `@gambrel/view`       | JSX runtime, VNodes, server renderer                | nothing                        |
| `@gambrel/router`     | Matching, resolution, payload, `composeRoute`       | `view`                         |
| `@gambrel/browser`    | `mount`, `hydrate`, `hydrateRoutes`                 | `view`, `reactivity`, `router` |
| `@gambrel/ssr`        | Document request handler                            | `router`, `view`               |
| `@gambrel/compiler`   | Route discovery, manifests, builds                  | `router`                       |

`core` has no Bun, JSX or DOM dependency. `router` has no HTTP or filesystem dependency. Both `core` and `router` export a function named `redirect`: core's returns a `Response`, the router's returns an outcome for guards and loaders.

## Documentation

- `docs/architecture.md`: boundaries and dependency direction
- `docs/core.md`, `docs/view.md`, `docs/reactivity.md`, `docs/browser.md`
- `docs/router.md`, `docs/compiler.md`, `docs/ssr-hydration.md`, `docs/build.md`
- `docs/progress.md`: phase log and verification record

## Limitations and non-goals

- Bun only. Not published; no license chosen.
- No client-side navigation (links are full page loads), no HMR, one client bundle (no route-level code splitting).
- Route components are synchronous. Dynamic regions re-render their whole content (no keyed diffing). No SVG namespace support in the browser runtime.
- Event handlers are typed with a minimal `ViewEvent`; DOM-specific members need a cast.
- Core does not answer HEAD or OPTIONS for explicit routes automatically; document routes do answer HEAD.
- Hydration is tested against happy-dom; confirm in a real browser with the steps in `docs/build.md`.
- Not provided: database, authentication, forms, CSS tooling, other runtimes, a CLI, or a plugin system.