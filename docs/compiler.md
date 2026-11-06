# @gambrel/compiler

Route discovery and generated manifests. Server rendering, bundling and the production build are added in later phases.

## Route conventions

```text
src/routes/
├── layout.tsx             root layout, wraps every route
├── page.tsx               /
├── about/page.tsx         /about
├── users/
│   ├── layout.tsx         wraps everything under /users
│   └── [id]/
│       ├── page.tsx       /users/:id
│       └── page.server.ts loader / beforeLoad for that page
├── docs/[...slug]/page.tsx   /docs/a, /docs/a/b (one or more segments)
├── (marketing)/pricing/page.tsx   /pricing (the group adds no URL segment)
└── _components/           ignored, with its subtree
```

- Component files are exactly `page.tsx` and `layout.tsx`, default-exporting a `PageComponent` or `LayoutComponent`. They are imported by both the server and the browser and must not import server-only code.
- Server files are exactly `page.server.ts` and `layout.server.ts`, next to their component. They may export only `loader` and `beforeLoad`. They are imported by the server manifest only.
- Directories starting with `_` or `.` are ignored with their whole subtree. Other files are ignored.
- Layouts apply to their whole subtree, including inside groups, outermost first.

## Route IDs

`page:/<dir>` and `layout:/<dir>`, where `<dir>` is the directory path relative to the routes directory, groups included: `page:/users/[id]`, `layout:/(marketing)`. IDs depend only on the file layout.

## Generated files (`.gambrel/`)

| File                 | Contents                                                                        |
| -------------------- | ------------------------------------------------------------------------------- |
| `routes.ts`          | `routes`: the route records, sorted by id.                                      |
| `manifest.client.ts` | `routes` and `components` (id to component). Never references a `.server` file. |
| `manifest.server.ts` | `routes`, `components` and `hooks` (id to guard and loader).                    |

Output is deterministic and rewritten only when content changes. Components are imported statically, so the browser receives a single bundle; code-splitting is not supported yet.

## API

- `buildRouteTable(files, routesDir)`: pure; builds the table from relative file paths.
- `discoverRoutes(routesDir)`: reads the directory and builds the table.
- `generateModules(table, outDir)`: renders the three modules as strings.
- `writeModules(modules, outDir)`: writes changed files, returns their names.
- `generateRoutes({ root, routesDir?, outDir? })`: all of the above. Defaults: `src/routes` and `.gambrel`.

## Errors

`CompilerError` carries every problem found, each naming the file or directory: unsupported route file names, server files without a component, invalid group names, invalid patterns, pages that resolve to the same URL (including through groups), a missing routes directory, and a routes directory without pages.