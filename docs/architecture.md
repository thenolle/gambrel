# Gambrel architecture

## Release model

Release model: monorepo-only prototype; every package is `private`.

## Packages and responsibilities

| Package               | Responsibility                                          | Runtime dependencies                                   |
| --------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| `@gambrel/reactivity` | Signals, effects, cleanup                               | none                                                   |
| `@gambrel/view`       | VNodes, JSX runtime, server renderer                    | `@gambrel/reactivity` (only if needed)                 |
| `@gambrel/browser`    | Mount, hydrate, DOM updates, events, `hydrateRoutes`   | `view`, `reactivity`, `router`                         |
| `@gambrel/router`     | Matching, resolution, hydration payload, `composeRoute` | `view` (types, and `createElement` for `composeRoute`) |
| `@gambrel/ssr`        | Document request handler                                | `router`, `view`                                       |
| `@gambrel/compiler`   | Route discovery, manifests, builds                      | `router` (types)                                       |
| `@gambrel/core`       | Server app, context, response normalization             | none                                                   |
| `@gambrel/bun`        | `Bun.serve` adapter                                     | `core`                                                 |

## Dependency direction

    reactivity
    view     -> reactivity (optional)
    browser  -> view, reactivity, router
    router   -> view
    ssr      -> router, view
    compiler -> router (types)
    core
    bun      -> core

Lower-level packages never import the application layer.

## Environment boundaries

| Package                        | DOM types | Bun types |
| ------------------------------ | --------- | --------- |
| reactivity, view, router, core | no        | no        |
| browser                        | yes       | no        |
| compiler, bun                  | no        | yes       |

This is enforced by each package's `tsconfig.json`, so a stray `document` or `Bun` reference in the wrong package fails type checking.

## Conventions

- ESM, strict TypeScript, single quotes, no semicolons.
- One public entry point per package: `src/index.ts`.
- `dev`, `build`, `start` and `test` scripts are added in the phase that introduces their real targets.