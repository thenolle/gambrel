# Gambrel

A small TypeScript-first, JSX-based full-stack web framework for Bun: file-system routing with nested layouts, typed loaders and guards, server-side rendering, and browser hydration.

> **Prototype.** Bun only. Packages are not published. Licensed under the **PolyForm Strict License 1.0.0**: noncommercial use only, no distribution, no modification. See [LICENSE](./LICENSE).

## Features

- Routes are files: `page.tsx`, `layout.tsx`, with `[id]` and `[...slug]` segments and `(groups)`
- Typed params and loader data, flowing from the route pattern into your components
- Guards and loaders that run only on the server, with redirects, denials and 404s as explicit outcomes
- Server-rendered HTML that the browser hydrates in place, with mismatches reported and repaired locally
- Signals and effects for interactive components
- A production build with separate server and browser bundles, and a check that server code never reaches the browser
- Safe by default: escaped output, JSON-only data, safely embedded payload

## Quick start

```bash
git clone [https://github.com/thenolle/gambrel.git](https://github.com/thenolle/gambrel.git)
cd gambrel
bun install
bun run typecheck
bun test
bun run build
bun run start      # http://localhost:3000
```

Development with automatic browser-bundle rebuilds: `bun run dev` (reload the page after a change).

## Documentation

Read the documentation in a searchable site, rendered from the Markdown in [`docs/`](./docs):

```bash
bun run docs       # http://localhost:4000
bun run docs:build # static site in website/dist
```

| Start here                                   | Concepts                                                   | Reference                           |
| -------------------------------------------- | ---------------------------------------------------------- | ----------------------------------- |
| [Introduction](./docs/introduction.md)       | [Routing and layouts](./docs/routing.md)                   | [Cheat sheet](./docs/cheatsheet.md) |
| [Getting started](./docs/getting-started.md) | [Server/client boundary](./docs/server-client-boundary.md) | [@gambrel/core](./docs/core.md)     |
| [Tutorial](./docs/tutorial.md)               | [SSR and hydration](./docs/ssr-hydration.md)               | [@gambrel/router](./docs/router.md) |

## A minimal example

```tsx
// src/routes/hello/[name]/page.server.ts
import type { Context } from '@gambrel/core'
import type { Loader, ParamsOf } from '@gambrel/router'

export const loader: Loader<ParamsOf<'/hello/[name]'>, { greeting: string }, Context> = (ctx) => ({
  greeting: `Hello, ${ctx.params.name}!`
})
```

```tsx
// src/routes/hello/[name]/page.tsx
/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function GreetingPage(props: PageProps<ParamsOf<'/hello/[name]'>, LoaderData<typeof loader>>): Child {
  return <h1>{props.data.greeting}</h1>
}
```

`/hello/Ada` is rendered on the server, hydrated in the browser, and the loader never ships to the client.

## Packages

| Package               | Responsibility                                             |
| --------------------- | ---------------------------------------------------------- |
| `@gambrel/core`       | Server application: routes, context, middleware, responses |
| `@gambrel/bun`        | `Bun.serve` adapter and static files                       |
| `@gambrel/view`       | JSX runtime and server renderer                            |
| `@gambrel/icons`      | Icon components, built on `@gambrel/view`                  |
| `@gambrel/reactivity` | Signals, effects, ownership                                |
| `@gambrel/router`     | Matching, resolution, hydration payload                    |
| `@gambrel/browser`    | Mount, hydrate, `hydrateRoutes`                            |
| `@gambrel/ssr`        | Document request handler                                   |
| `@gambrel/compiler`   | Route discovery, manifests, builds                         |

See [Architecture](./docs/architecture.md) for the dependency direction.

## Limitations

Bun only, no client-side navigation, no hot module replacement, one browser bundle, synchronous route components. Hydration is covered by automated tests in happy-dom; confirm in a real browser as described in [Testing your app](./docs/testing.md). Full list: [Limitations and roadmap](./docs/limitations.md).

## License

Licensed under the [PolyForm Strict License 1.0.0](https://polyformproject.org/licenses/strict/1.0.0): you may run and study the software for noncommercial purposes; you may not distribute it or make changes or new works based on it. See [LICENSE](./LICENSE) and [License](./docs/license.md).