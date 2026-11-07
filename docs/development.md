# Application structure

A Gambrel application separates build scripts, server entry points, browser entry points and shared components.

## Recommended layout

```text
my-app/
├── package.json
├── tsconfig.json
├── gambrel.config.ts
├── scripts/
│   └── build.ts
├── public/
│   └── app.css
└── src/
    ├── server.ts
    ├── client.ts
    ├── components/
    ├── data/
    └── routes/
        ├── layout.tsx
        ├── page.tsx
        └── users/
            └── [id]/
                ├── page.tsx
                └── page.server.ts
```

## Server entry

The server entry combines HTTP handlers, static assets and document rendering.

Explicit API routes handle their requests first. The document handler resolves page requests and produces HTML responses.

Server-only dependencies belong in this graph.

## Browser entry

The browser entry mounts an interface or hydrates server-rendered HTML.

For routed hydration:

```ts
import { hydrateRoutes } from '@gambrel/browser'
import { components, routes } from '../.gambrel/manifest.client.ts'

hydrateRoutes({ routes, components })
```

The client manifest contains component imports, not loaders or guards.

## Shared components

Components used in pages and layouts must be safe to render on the server and in the browser.

Use stable initial data. Avoid reading browser globals while building the initial server-rendered tree.

Perform element-specific browser setup inside a `ref` callback and release resources with ownership cleanup.

## Route hooks

Place loaders and guards in `page.server.ts` and `layout.server.ts`.

Use type-only imports when a page needs its loader's data type:

```ts
import type { loader } from './page.server.ts'
```

That import is erased and does not add the server module to the browser graph.

## Public assets

Serve a dedicated directory containing only public files.

Keep application data, credentials and private configuration outside that directory.

Copy package stylesheets into the public build output through their documented exports instead of exposing an entire package directory.

## Build output

The application build separates server and browser artifacts.

The default structure is:

```text
dist/
├── server/
├── client/
└── manifest/
```

See [Build output](./build.md) for the compiler's output conventions.

## Choosing a rendering mode

| Mode               | Use when                                                |
| ------------------ | ------------------------------------------------------- |
| SSR with hydration | Initial HTML and browser interaction are both important |
| CSR                | The interface is mounted and driven by browser code     |
| Server-only HTML   | Native forms and document navigation are sufficient     |

The examples demonstrate these modes with the same task-board workflow.

## Related

- [Architecture](./architecture.md)
- [Routing and layouts](./routing.md)
- [SSR and hydration](./ssr-hydration.md)
- [Server–client boundary](./server-client-boundary.md)