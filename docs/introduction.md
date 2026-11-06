# Gambrel

Gambrel is a small, TypeScript-first, JSX-based full-stack web framework for Bun. You write pages and layouts as files, load data on the server, and get server-rendered HTML that comes alive in the browser without being thrown away and rebuilt.

> [!WARNING]
> Gambrel is a prototype. It runs on Bun only, its packages are not published, and it is licensed under the PolyForm Strict License 1.0.0: noncommercial use only, with no distribution or modification. See `LICENSE`.

## Why Gambrel

- **Small and readable.** Eight packages with one job each. You can understand the framework by reading its source.
- **Server rendering first.** Every page is rendered to complete HTML on the server. The browser then attaches behavior to the HTML it already has.
- **Typed routes.** Route params and loader data are typed from the route pattern and flow into your page components.
- **Safe by construction.** Only plain JSON crosses from server to browser, and it is embedded so it cannot break out of its `<script>` tag.
- **No hidden boundary.** Server code lives in `*.server.ts` files. The client build refuses to bundle them, and the build fails loudly if you try.

## A page in a few lines

A route is a file. This one creates `/hello`:

```tsx title="src/routes/hello/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'

export default function HelloPage(): Child {
  return <h1>Hello from Gambrel</h1>
}
```

Add a sibling `page.server.ts` and the page gets typed data from the server:

```ts title="src/routes/hello/page.server.ts"
import type { Loader, ParamsOf } from '@gambrel/router'

export const loader: Loader<ParamsOf<'/hello'>, { now: string }> = () => ({
  now: new Date().toISOString()
})
```

## How a request flows

```text
Request ─► router matches the URL ─► guards run (outer layout → page)
        ─► loaders run (outer layout → page) ─► layouts + page render to HTML
        ─► HTML + JSON payload + script tag are sent
Browser ─► loads the script ─► validates the payload
        ─► rebuilds the same component tree ─► hydrates the existing HTML
```

Loaders and guards run only on the server. The browser reuses the data the server already sent.

## The pieces

| Package               | What it does                                                                        |
| --------------------- | ----------------------------------------------------------------------------------- |
| `@gambrel/core`       | The server application: routes, request context, middleware, responses.             |
| `@gambrel/bun`        | Connects the application to `Bun.serve`, and serves static files.                   |
| `@gambrel/view`       | The JSX runtime and the server renderer.                                            |
| `@gambrel/reactivity` | Signals and effects for interactive components.                                     |
| `@gambrel/browser`    | Mounts and hydrates components in the browser.                                      |
| `@gambrel/router`     | Route matching, guards, loaders and the hydration payload.                          |
| `@gambrel/ssr`        | Turns a request into a rendered HTML document.                                      |
| `@gambrel/compiler`   | Finds your route files, generates manifests, builds the server and browser bundles. |

The [architecture](./architecture.md) page explains how they depend on each other.

## What Gambrel does not do

Gambrel deliberately stays small. There is no database layer, authentication, form library, CSS tooling, plugin system or CLI. Links are full page loads (no client-side navigation yet), there is no hot module replacement, and it runs on Bun only.

## Where to go next

1. [Getting started](./getting-started.md): install, run the example and add your first routes.
2. [SSR and hydration](./ssr-hydration.md): how server HTML becomes an interactive page.
3. [Router](./router.md): patterns, guards, loaders and resolution.