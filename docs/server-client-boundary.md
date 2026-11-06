# The server/client boundary

Most of a Gambrel app runs in two places: once on the server to produce HTML, and again in the browser to make that HTML interactive. Knowing which code runs where keeps your app fast and your secrets private.

## The rule

| File                                 | Runs on                | Can import server-only code |
| ------------------------------------ | ---------------------- | --------------------------- |
| `page.tsx`, `layout.tsx`             | server **and** browser | no                          |
| `page.server.ts`, `layout.server.ts` | server only            | yes                         |
| `src/app.ts`, `src/server.ts`        | server only            | yes                         |
| `src/client.ts`                      | browser only           | no                          |
| shared components (`src/components`) | server **and** browser | no                          |

A component file is rendered on the server first and then rebuilt in the browser from the same data, so it must work in both places.

## What reaches the browser

Whatever a loader returns is written into the page as JSON, so the browser can rebuild the same tree. That data is **public**: anyone who can load the page can read it in the page source.

> [!WARNING]
> Never return secrets, tokens, password hashes, internal IDs you want hidden, or whole database records from a loader. Pick the fields the page needs, as the examples do.

```ts
export const loader: Loader<ParamsOf<'/users/[id]'>, { name: string }, Context> = (ctx) => {
  const user = findUser(ctx.params.id)
  if (user === undefined) return notFound()
  return { name: user.name }
}
```

Only `name` is sent. The rest of the user record stays on the server.

## Server-only code

Put anything that must not ship to the browser in a `*.server.ts` file, or in a module that only `*.server.ts` files import (such as `src/data/`).

```ts title="src/routes/users/[id]/page.server.ts"
import { findUser } from '../../../data/users.ts'
```

```tsx title="src/routes/users/[id]/page.tsx"
import type { loader } from './page.server.ts'
```

The second file imports the loader **as a type only**. `import type` is erased at build time, so the server file is never bundled for the browser. Without `type`, the build stops.

## How the build enforces it

The browser bundle is built from `src/client.ts`, a separate entry from the server. During the build, Gambrel fails if the browser's import graph reaches any of:

- a `*.server.ts` file
- `@gambrel/ssr`, `@gambrel/bun`, `@gambrel/core` or `@gambrel/compiler`
- a `bun:` or `node:` module

The error names the file that imported it:

```text
Server-only module './page.server.ts' is imported by '.../page.tsx' and would ship to the browser.
```

This check does not rely on tree-shaking, so server code cannot slip through because a bundler failed to remove it.

## What can be sent

Loader data must be plain JSON.

| Allowed                   | Rejected (with the path in the error) |
| ------------------------- | ------------------------------------- |
| `null`, booleans, strings | `undefined`                           |
| finite numbers            | `NaN`, `Infinity`                     |
| arrays and plain objects  | `Date`, `Map`, `Set`, class instances |
|                           | functions, symbols, `bigint`          |
|                           | circular references                   |

Convert dates to strings, and use `null` for "no value". If a loader returns something invalid, the request fails with a 500 and the error names the exact path, such as `loader data of 'page:/x'.user.joined is not plain JSON`.

## Sharing code safely

- Put components used by pages and layouts in `src/components/`. They must only import browser-safe code.
- Put types shared by a loader and its page in the `*.server.ts` file and import them with `import type`.
- Put anything that touches files, databases or environment variables in `*.server.ts` or in `src/data/`.

See [SSR and hydration](./ssr-hydration.md) for how the data travels, and [Build and development](./build.md) for the build output.