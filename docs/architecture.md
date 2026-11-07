# Architecture

Gambrel separates HTTP handling, rendering, reactivity, routing and compilation into small packages.

Applications compose those packages explicitly. A renderer does not start a server, a router does not read the filesystem, and the compiler does not handle requests.

## Package responsibilities

| Package               | Responsibility                                                     | Direct Gambrel dependencies    |
| --------------------- | ------------------------------------------------------------------ | ------------------------------ |
| `@gambrel/core`       | HTTP application, middleware, request context and response helpers | None                           |
| `@gambrel/bun`        | Bun server adapter and static files                                | `core`                         |
| `@gambrel/view`       | JSX runtime, elements and server rendering                         | None                           |
| `@gambrel/reactivity` | Signals, effects, cleanup and ownership                            | None                           |
| `@gambrel/router`     | Matching, resolution, layout composition and hydration data        | `view`                         |
| `@gambrel/browser`    | DOM mounting and hydration                                         | `view`, `reactivity`, `router` |
| `@gambrel/ssr`        | Document request handling                                          | `router`, `view`               |
| `@gambrel/compiler`   | Route discovery, manifests and builds                              | `router`                       |
| `@gambrel/icons`      | SVG icon components                                                | `view`                         |
| `@gambrel/components` | Themeable UI components                                            | `view`, `reactivity`, `icons`  |

The application sits above these packages and supplies its routes, server hooks, data access and deployment configuration.

## Execution environments

| Layer                                  | Typical execution                      |
| -------------------------------------- | -------------------------------------- |
| Core, Bun adapter and document handler | Server                                 |
| Compiler                               | Build scripts                          |
| Browser runtime                        | Browser                                |
| View, router and reactivity            | Shared code, depending on the API used |
| Components and icons                   | Server rendering and browser rendering |

Importing a package does not imply that every operation belongs in every environment.

Signals and reactive effects are environment-independent. An effect that touches the DOM belongs in a browser execution path. The server renderer reads child accessors but does not create a persistent browser ownership tree.

## Server-rendered request

A typical routed document follows this sequence:

1. The Bun adapter passes a Request to the core application.
2. Static-file middleware and explicit HTTP routes may answer it.
3. The document handler receives remaining page requests.
4. The router matches the pathname.
5. Guards run from the outermost layout to the page.
6. Loaders run in the same order.
7. Each matched entry keeps its own loader data.
8. The layout and page tree renders to HTML.
9. If a browser entry is configured, the response includes hydration data and its script reference.

Without a browser entry, the document remains server-only HTML.

## Browser hydration

The browser entry reads the document's payload and checks it against the client route table.

It then reconstructs the component tree using the same route parameters and per-entry data.

Hydration reuses matching DOM nodes and attaches behavior. Reported mismatches are repaired locally. Loaders and guards are not rerun in the browser.

See [SSR and hydration](./ssr-hydration.md).

## Browser mounting

A client-rendered application uses `mount` instead of adopting server-rendered application content.

The browser owns the initial application rendering and any subsequent data loading.

Server-side APIs can still serve its data; CSR describes where the interface renders, not whether the application has a server.

See [Rendering examples](./examples.md).

## Build graphs

The browser and server are built from different entry points.

The generated browser manifest imports page and layout components. The generated server manifest additionally imports server hooks.

The client build rejects recognized server-only imports. Component files must still avoid importing private data or environment-specific behavior from otherwise ordinary shared modules.

See [Server–client boundary](./server-client-boundary.md).

## Package format

Workspace packages expose source entry points for development.

Release staging produces ESM JavaScript, TypeScript declarations, public exports, package READMEs and license files.

Consumers should use package exports rather than internal source paths.

## Related

- [Application structure](./development.md)
- [Build output](./build.md)
- [Compatibility](./limitations.md)
- [Security](./security.md)