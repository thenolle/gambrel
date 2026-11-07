# Working on Gambrel

How the repository is organized and the conventions it follows.

## Repository layout

```text
gambrel/
├── packages/
│   ├── core/         server application
│   ├── bun/          Bun adapter and static files
│   ├── view/         JSX runtime and server renderer
│   ├── reactivity/   signals and effects
│   ├── router/       matching, resolution, payload
│   ├── browser/      mount, hydrate, hydrateRoutes
│   ├── ssr/          document request handler
│   └── compiler/     discovery, manifests, builds
│   ├── release-tools/ release tooling
│   └── components/   shared components
├── examples/app/     the example application and its integration tests
├── website/          this documentation site
├── docs/             the documentation (Markdown)
└── LICENSE
```

The dependency direction is fixed: lower-level packages never import higher-level ones. See [Architecture](./architecture.md).

## Commands

| Command                         | Does                                               |
| ------------------------------- | -------------------------------------------------- |
| `bun install`                   | Link the workspace                                 |
| `bun run typecheck`             | Type-check every package, the example and the site |
| `bun test`                      | Run every test                                     |
| `bun run dev`, `build`, `start` | Run the example app                                |
| `bun run docs`                  | Serve the documentation                            |

A change is ready when `typecheck` and `test` both pass.

## Conventions

- TypeScript with strict settings, including `exactOptionalPropertyTypes` and `noUncheckedIndexedAccess`. Settings are never weakened to make code pass.
- ESM everywhere, single quotes, no semicolons, small modules with explicit exports.
- No third-party runtime dependencies.
- Packages export TypeScript source through `src/index.ts`, and every package is `private`.
- Fail loudly: invalid input throws an error that names what is wrong. No silent fallbacks.
- Deterministic output: sorted lists, no timestamps.
- Test public behavior and integration, not implementation details.

## Add a package

1. Create `packages/<name>` with `package.json` (`private`, `exports` pointing at `./src/index.ts`) and a `tsconfig.json` that extends `../../tsconfig.base.json`.
2. Add it to the `references` in the root `tsconfig.json`.
3. Run `bun install`.
4. Write tests in `test/` and a documentation page.

## Add a documentation page

1. Write `docs/<name>.md`, starting with one `#` title.
2. Add it to `docs/nav.json`.
3. Run `bun test website`.

The tests check that every page in the navigation exists, every Markdown file is listed, and every internal link points at a real page.

## Commit style

Short, imperative, with a type prefix as used in the history: `feat(router): ...`, `fix(website): ...`, `docs: ...`, `test(example): ...`.

## Contributions

The [license](./license.md) does not grant the right to modify or share the code. If you would like to contribute, open an issue first and the maintainer will tell you how to proceed.