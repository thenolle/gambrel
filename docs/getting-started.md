# Getting started

This page takes you from a clean checkout to your own routes with server-loaded data and an interactive component.

## Requirements

- [Bun](https://bun.sh), a recent version (developed with 1.4.4-canary.1 on Windows)
- Git

## Get the code and run it

```bash
git clone [https://github.com/thenolle/gambrel.git](https://github.com/thenolle/gambrel.git)
cd gambrel
bun install
bun run typecheck
bun test
```

> [!NOTE]
> Gambrel is licensed under the PolyForm Strict License 1.0.0. You may run it and study it for noncommercial purposes. You may not distribute it or make changes you share.

Start the example:

```bash
bun run build
bun run start      # http://localhost:3000
```

| Command             | What it does                                                               |
| ------------------- | -------------------------------------------------------------------------- |
| `bun run typecheck` | Regenerates the example's route manifests, then type-checks every package. |
| `bun test`          | Runs all tests, including the build and end-to-end tests.                  |
| `bun run build`     | Builds the example into `examples/app/dist`.                               |
| `bun run start`     | Runs the built server with `NODE_ENV=production`. Build first.             |
| `bun run dev`       | Development server that rebuilds the browser bundle when files change.     |
| `bun run docs`      | Serves this documentation site on port 4000.                               |

In development, reload the page after a change. There is no hot module replacement.

## Tour of the example

```text
examples/app/
├── gambrel.config.ts        optional configuration
├── scripts/                 generate, build and dev scripts
└── src/
    ├── server.ts            starts the server
    ├── app.ts               combines core, static files and the document handler
    ├── client.ts            the browser entry: hydrateRoutes
    ├── components/          shared, browser-safe components
    ├── data/                server-only data (never imported by a page)
    └── routes/
        ├── layout.tsx       root layout: the whole HTML document
        ├── page.tsx         /
        ├── about/page.tsx   /about
        ├── admin/           /admin, protected by a guard
        ├── docs/[...slug]/  /docs/anything/below
        └── users/           /users and /users/:id, with a nested layout
```

## Add your first page

Create `examples/app/src/routes/hello/page.tsx`:

```tsx title="src/routes/hello/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'

export default function HelloPage(): Child {
  return (
    <section>
      <h1>Hello</h1>
      <p>This page is rendered on the server and hydrated in the browser.</p>
    </section>
  )
}
```

Run `bun run dev` and open `http://localhost:3000/hello`. The root layout already wraps it.

> [!TIP]
> Put the `/** @jsxImportSource @gambrel/view */` line at the top of every `.tsx` file. The bundler and the test runner both read it reliably.

If the new page returns 404, stop `bun run dev` and start it again so the route manifests are regenerated.

## Add a dynamic route with a loader

Create two files in `src/routes/hello/[name]/`. The folder name `[name]` makes a dynamic segment, so `/hello/Ada` and `/hello/Grace` both match.

```ts title="src/routes/hello/[name]/page.server.ts"
import type { Context } from '@gambrel/core'
import type { Loader, ParamsOf } from '@gambrel/router'

export const loader: Loader<ParamsOf<'/hello/[name]'>, { greeting: string }, Context> = (ctx) => ({
  greeting: `Hello, ${ctx.params.name}!`
})
```

```tsx title="src/routes/hello/[name]/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function GreetingPage(
  props: PageProps<ParamsOf<'/hello/[name]'>, LoaderData<typeof loader>>
): Child {
  return <h1>{props.data.greeting}</h1>
}
```

Two things to notice:

- `props.params.name` is a `string` and `props.data.greeting` is typed, both inferred from the route pattern and the loader.
- The page imports the loader with `import type`. That import is erased, so the server file never reaches the browser.

## Make it interactive

Components can use signals. Reuse the example's counter on your page:

```tsx title="src/routes/hello/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { Counter } from '../../components/counter.tsx'

export default function HelloPage(): Child {
  return (
    <section>
      <h1>Hello</h1>
      <Counter />
    </section>
  )
}
```

The server renders `Clicked 0 times`. The browser keeps that HTML, attaches the click handler, and updates the number in place.

## Protect a route with a guard

A guard runs before any loader. Add `page.server.ts` next to a page and export `beforeLoad`:

```ts title="src/routes/admin/page.server.ts"
import type { Context } from '@gambrel/core'
import { redirect, type Guard, type ParamsOf } from '@gambrel/router'

export const beforeLoad: Guard<ParamsOf<'/admin'>, Context> = (ctx) => {
  if (ctx.context.request.headers.get('x-demo-user') === null) return redirect('/')
  return undefined
}
```

Try it:

```bash
curl -i http://localhost:3000/admin
curl -i -H 'x-demo-user: ada' http://localhost:3000/admin
```

The first request is redirected to `/`. The second renders the page.

## Common problems

| Symptom                                                           | Cause and fix                                                                                             |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| A new route returns 404                                           | The route manifests were not regenerated. Restart `bun run dev`.                                          |
| `unsupported route file` when generating                          | Route files must be exactly `page.tsx`, `layout.tsx`, `page.server.ts` or `layout.server.ts`.             |
| The build says `Server-only module ... would ship to the browser` | A `page.tsx` or `layout.tsx` imports server code. Move that code into `page.server.ts`.                   |
| The page works but nothing is interactive                         | The browser script failed to load or hydration threw. Open the browser console.                           |
| `The root layout must render a <body>`                            | The server injects the hydration scripts before `</body>`. Make sure your root layout renders a `<body>`. |

See [Build and development](./build.md) for the full build output and [Router](./router.md) for patterns and resolution order.