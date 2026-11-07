# Gambrel

TypeScript, JSX, and explicit server–browser boundaries.

Gambrel is a modular web framework for Bun. Build server-rendered applications with hydration, browser-rendered interfaces, or HTML applications that work without client JavaScript.

[Documentation](https://thenolle.github.io/gambrel/) · [Icon catalog](https://thenolle.github.io/gambrel/icons.html) · [Source](https://github.com/thenolle/gambrel)

## What you can build

- Server-rendered pages with nested layouts, route loaders, and guards
- Hydrated interfaces that reuse server-rendered HTML
- Browser-mounted applications using signals and components
- Server-only applications using native forms and redirects
- HTTP APIs with a small application layer
- Interfaces built from themeable components and SVG icons

## A typed route

Load data on the server:

```ts
import type { Loader, ParamsOf } from '@gambrel/router'

export const loader: Loader<
  ParamsOf<'/hello/[name]'>,
  { greeting: string }
> = ({ params }) => ({
  greeting: `Hello, ${params.name}!`
})
```

Render the page:

```tsx
/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function HelloPage(
  props: PageProps<ParamsOf<'/hello/[name]'>, LoaderData<typeof loader>>
): Child {
  return <h1>{props.data.greeting}</h1>
}
```

The server loader lives in `page.server.ts`. The component lives in `page.tsx`. Its type-only import does not add the server module to the browser bundle.

## Try the examples

```bash
git clone [https://github.com/thenolle/gambrel.git](https://github.com/thenolle/gambrel.git)
cd gambrel
bun install
```

The file-routing example:

```bash
bun run build
bun run start
```

The complete task-board examples:

```bash
bun run --filter @gambrel/example-modes ssr
bun run --filter @gambrel/example-modes csr
bun run --filter @gambrel/example-modes server
```

| Mode               | Default address         | Initial rendering                                    |
| ------------------ | ----------------------- | ---------------------------------------------------- |
| SSR with hydration | `http://localhost:3101` | Task content is rendered on the server and hydrated  |
| CSR                | `http://localhost:3102` | The browser mounts the interface and loads its data  |
| Server-only HTML   | `http://localhost:3103` | Native forms and server rendering; no browser bundle |

Each task-board mode uses a separate JSON data file. The examples are single-user, single-process applications.

## Packages

| Package               | Purpose                                                      |
| --------------------- | ------------------------------------------------------------ |
| `@gambrel/core`       | HTTP application, middleware, routing, and response helpers  |
| `@gambrel/bun`        | Bun server adapter and static files                          |
| `@gambrel/view`       | JSX runtime, element types, and HTML rendering               |
| `@gambrel/reactivity` | Signals, effects, batching, and ownership                    |
| `@gambrel/router`     | Route matching, loaders, guards, layouts, and hydration data |
| `@gambrel/browser`    | Browser mounting and hydration                               |
| `@gambrel/ssr`        | Document request handling                                    |
| `@gambrel/compiler`   | File-route discovery, manifests, and application builds      |
| `@gambrel/components` | Themeable UI components with plain CSS                       |
| `@gambrel/icons`      | SVG icon components and a searchable catalog                 |

Packages use ESM. The server runtime is Bun.

## Components and icons

```tsx
/** @jsxImportSource @gambrel/view */
import { Button } from '@gambrel/components'
import { Plus } from '@gambrel/icons'

export function AddButton() {
  return (
    <Button onClick={() => console.log('Add')}>
      <Plus size={16} />
      Add item
    </Button>
  )
}
```

Load `@gambrel/components/styles.css` once in your application. The stylesheet uses `gb-*` classes and CSS custom properties; it does not require Tailwind.

## Documentation

- [Getting started](https://thenolle.github.io/gambrel/#/getting-started)
- [Routing and layouts](https://thenolle.github.io/gambrel/#/routing)
- [Server–client boundary](https://thenolle.github.io/gambrel/#/server-client-boundary)
- [SSR and hydration](https://thenolle.github.io/gambrel/#/ssr-hydration)
- [Components](https://thenolle.github.io/gambrel/#/components)
- [Icons](https://thenolle.github.io/gambrel/#/icons)

Run the documentation locally:

```bash
bun run docs
```

Build a static copy:

```bash
bun run docs:build
```

## Development checks

```bash
bun run typecheck
bun test
```

The repository includes package tests, application integration tests, production-build checks, and isolated packed-package consumer verification.

## Compatibility

Gambrel uses its own component and JSX runtime. React components are not interchangeable with Gambrel components.

Route components are synchronous. Links perform document navigation. Dynamic child regions replace their contents when updated; they do not provide keyed reconciliation.

## License

PolyForm Strict License 1.0.0.

Use, modification, redistribution, and application deployment must comply with the license. Do not assume an open-source or commercial-use grant.

Read [LICENSE](./LICENSE) before adopting or distributing Gambrel. For rights not granted there, contact the maintainer through the repository.