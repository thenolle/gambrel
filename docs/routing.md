# Routing and layouts

Gambrel routes are files. The folder structure under `src/routes` is the URL structure, and the file names say what each file does.

## Files become routes

```text
src/routes/
├── layout.tsx                   wraps every page
├── page.tsx                     /
├── about/page.tsx               /about
├── users/
│   ├── layout.tsx               wraps /users and everything below it
│   ├── page.tsx                 /users
│   └── [id]/
│       ├── page.tsx             /users/42
│       └── page.server.ts       loader and guard for /users/42
└── docs/[...slug]/page.tsx      /docs/a, /docs/a/b/c
```

| File               | Purpose                                                         |
| ------------------ | --------------------------------------------------------------- |
| `page.tsx`         | The page for its folder's URL. Default export is a component.   |
| `layout.tsx`       | Wraps every page below it. Receives `children`.                 |
| `page.server.ts`   | Optional. Server-only `loader` and `beforeLoad` for the page.   |
| `layout.server.ts` | Optional. Server-only `loader` and `beforeLoad` for the layout. |

Any other file in a route folder (for example a helper component) is ignored. Files with the wrong name, such as `page.ts` or `page.jsx`, fail the build with a message that names them.

## Dynamic and catch-all segments

| Folder name | Matches                                | Param type          |
| ----------- | -------------------------------------- | ------------------- |
| `[id]`      | exactly one segment                    | `string`            |
| `[...slug]` | one or more segments, must be the last | `readonly string[]` |

Params are decoded for you and typed from the pattern:

```tsx title="src/routes/docs/[...slug]/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'

export default function DocsPage(props: PageProps<ParamsOf<'/docs/[...slug]'>, null>): Child {
  return <p>{props.params.slug.join(' / ')}</p>
}
```

`/docs/a%20b/c` renders `a b / c`. `/docs` alone does not match, because a catch-all needs at least one segment.

## Groups and ignored folders

- `(name)` is a **group**. It organizes files and shares layouts but adds nothing to the URL. `(marketing)/pricing/page.tsx` serves `/pricing`.
- Folders starting with `_` or `.` are **ignored** together with everything inside them. Use `_components/` for private helpers.

> [!WARNING]
> Two pages must not resolve to the same URL. `(a)/team/page.tsx` and `(b)/team/page.tsx` both serve `/team`, so the build fails and names both files. The same applies to `users/[id]` and `users/[name]`: only the parameter name differs.

## Which route wins

When several routes match a URL, Gambrel compares them segment by segment from the left. At the first difference, a static segment beats a dynamic one, and a dynamic one beats a catch-all.

| URL          | Routes that match                        | Winner        |
| ------------ | ---------------------------------------- | ------------- |
| `/users/me`  | `/users/me`, `/users/[id]`, `/[...slug]` | `/users/me`   |
| `/users/42`  | `/users/[id]`, `/[...slug]`              | `/users/[id]` |
| `/other/a/b` | `/[...slug]`                             | `/[...slug]`  |

The result never depends on the order of files on disk.

## Layouts

A layout wraps its folder's pages and all pages in subfolders, outermost first:

```tsx title="src/routes/users/layout.tsx"
/** @jsxImportSource @gambrel/view */
import type { LayoutProps, RouteParams } from '@gambrel/router'
import type { Child } from '@gambrel/view'

export default function UsersLayout(props: LayoutProps<RouteParams, null>): Child {
  return <section class="users">{props.children}</section>
}
```

For `/users/42`, the tree is: root layout, then the users layout, then the page.

The **root layout** renders the whole HTML document, including `<html>`, `<head>` and `<body>`. The server inserts its hydration scripts just before `</body>`, so a root layout without a `<body>` is an error.

### Data flows per file

Every layout and every page receives:

- `params`: the params of the matched URL (the same object for all of them)
- `data`: the result of **its own** loader, or `null` if it has none

A page's data never overwrites a layout's data, because they are separate entries.

```text
GET /users/42
  layout:/               data: null
  layout:/users          data: { total: 3 }       from users/layout.server.ts
  page:/users/[id]       data: { name: "Ada" }    from users/[id]/page.server.ts
```

Guards run first, from the outermost layout to the page. Then loaders run in the same order. The first redirect, denial, not-found or error stops everything.

## Details worth knowing

- A trailing slash does not change the match: `/about/` and `/about` are the same route.
- The query string is never matched. Hooks receive it as `search`.
- Malformed percent-encoding (for example `/%E0%A4%A`) is answered with `400 Bad Request`.
- Unknown URLs get a `404` document with no scripts, so error pages are never hydrated.

## Errors you may see while building

| Message                                    | Fix                                                                         |
| ------------------------------------------ | --------------------------------------------------------------------------- |
| `unsupported route file`                   | Rename to `page.tsx`, `layout.tsx`, `page.server.ts` or `layout.server.ts`. |
| `needs a 'page.tsx' in the same directory` | A `*.server.ts` file has no matching component next to it.                  |
| `resolve to the same URL`                  | Two pages map to one URL. Rename or remove one.                             |
| `must be the last segment`                 | Nothing can follow a `[...catch-all]` folder.                               |
| `invalid group name`                       | Use letters, digits, `_` or `-` inside the parentheses.                     |

For the full matching and resolution rules, see the [Router reference](./router.md).