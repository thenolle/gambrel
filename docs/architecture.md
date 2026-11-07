# Architecture

Gambrel is a set of small packages with explicit boundaries. Each one has a single job and a short list of dependencies.

## Packages

| Package               | Responsibility                                             | Depends on                     |
| --------------------- | ---------------------------------------------------------- | ------------------------------ |
| `@gambrel/core`       | Server application: routes, context, middleware, responses | nothing                        |
| `@gambrel/bun`        | `Bun.serve` adapter and static files                       | `core`                         |
| `@gambrel/view`       | JSX runtime and server renderer                            | nothing                        |
| `@gambrel/icons`      | Icon components                                            | `view`                         |
| `@gambrel/reactivity` | Signals, effects, ownership                                | nothing                        |
| `@gambrel/router`     | Matching, resolution, hydration payload, `composeRoute`    | `view`                         |
| `@gambrel/browser`    | Mount, hydrate, `hydrateRoutes`                            | `view`, `reactivity`, `router` |
| `@gambrel/ssr`        | Document request handler                                   | `router`, `view`               |
| `@gambrel/compiler`   | Route discovery, manifests, builds                         | `router`                       |

Your application sits on top and combines them. Lower-level packages never import it.

```text
reactivity    view    core
    │          │       │
    │          ▼       ▼
    │       router    bun
    │       ▲  ▲  ▲
    ▼       │  │  └──── compiler
 browser ───┘  └─ ssr
```

## Where code runs

| Package             | Server        | Browser | Build time |
| ------------------- | ------------- | ------- | ---------- |
| core, bun, ssr      | yes           | no      | no         |
| view, router        | yes           | yes     | no         |
| reactivity, browser | no (see note) | yes     | no         |
| compiler            | no            | no      | yes        |

`reactivity` also works on the server, because signals are plain functions, but effects only make sense in the browser. See [Interactivity](./interactivity.md).

## A request, step by step

1. `Bun.serve` hands the request to your core application.
2. Static files and explicit routes (the API) answer first.
3. Anything else reaches the document handler.
4. The router matches the URL, runs the guards, then the loaders, outermost layout first.
5. `composeRoute` builds the layout and page tree with each entry's own data.
6. `renderToString` produces the HTML, and the payload and script tag are inserted before `</body>`.
7. In the browser, `hydrateRoutes` validates the payload, rebuilds the same tree and hydrates the existing HTML.

## The build, step by step

1. The compiler reads `src/routes` and writes `.gambrel/` (route table, client manifest, server manifest).
2. The browser bundle is built from `src/client.ts`. A guard fails the build if server-only code is reachable.
3. The server bundle is built from `src/server.ts`, with its own dependency graph.
4. `dist/manifest` records what was built.

## Design rules

- **Explicit boundaries.** Server, browser, compiler, router and runtime adapter do not leak into each other.
- **One component contract.** Pages and layouts receive `params` and `data`; layouts also receive `children`.
- **Only JSON crosses the wire.** Nothing is serialized implicitly.
- **Fail loudly.** Invalid routes, data and payloads throw errors that name the problem.
- **Deterministic.** Sorted outputs, no timestamps, no dependence on file-system order.
- **Small.** Features that would need a large abstraction are left out. See [Limitations and roadmap](./limitations.md).