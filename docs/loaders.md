# Loaders

A loader fetches the data a page or layout needs, on the server, before anything is rendered. Its result is passed to the component as typed `data`.

## A first loader

Put a `loader` export in the `page.server.ts` (or `layout.server.ts`) next to the component:

```ts title="src/routes/books/[id]/page.server.ts"
import type { Context } from '@gambrel/core'
import { notFound, type Loader, type ParamsOf } from '@gambrel/router'
import { findBook } from '../../../data/books.ts'

type BookView = { id: string; title: string }

export const loader: Loader<ParamsOf<'/books/[id]'>, BookView, Context> = (ctx) => {
  const book = findBook(ctx.params.id)
  if (book === undefined) return notFound()
  return { id: book.id, title: book.title }
}
```

`Loader<Params, Data, Context>` takes three type arguments: the route's params, the data you return, and the context your application passes in. With the example app the context is core's `Context`.

## What the loader receives

| Field      | Type                   | Meaning                                                                              |
| ---------- | ---------------------- | ------------------------------------------------------------------------------------ |
| `params`   | typed from the pattern | Decoded route params. `[id]` is a `string`, `[...slug]` a `readonly string[]`.       |
| `pathname` | `string`               | The request path as received.                                                        |
| `search`   | `string`               | The query string including `?`, or an empty string.                                  |
| `context`  | your context type      | In the example, core's `Context`, which has `request`, `url`, `method` and `params`. |

## What a loader may return

| Return value                  | Effect                                                   |
| ----------------------------- | -------------------------------------------------------- |
| Plain JSON data               | Becomes `data` for this file's component.                |
| `redirect(location, status?)` | Ends the request with a redirect. Default status 302.    |
| `deny(status?, message?)`     | Ends the request with an error page. Default status 403. |
| `notFound()`                  | Ends the request with a 404 page.                        |

A loader may be `async`. Use `null` when there is no data: returning `undefined` is an error.

## Using the data in the page

`LoaderData<typeof loader>` turns the loader into the page's data type, so the two stay in sync:

```tsx title="src/routes/books/[id]/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function BookPage(props: PageProps<ParamsOf<'/books/[id]'>, LoaderData<typeof loader>>): Child {
  return <h1>{props.data.title}</h1>
}
```

Change the loader's return shape and TypeScript points at every place in the page that needs updating.

## Layout loaders and order

Layouts have loaders too, in `layout.server.ts`. For `/users/42`:

1. Every guard runs, from the outermost layout to the page.
2. Then every loader runs, in the same order, one after another.
3. Each component receives the data of its own loader. Entries without a loader get `null`.

Layout loaders receive the same params as the page, because they run for the whole URL.

## Reading the request

With core's `Context`, the request is available:

```ts
export const loader: Loader<ParamsOf<'/account'>, { language: string }, Context> = (ctx) => ({
  language: ctx.context.request.headers.get('accept-language') ?? 'en'
})
```

## What can go wrong

| Situation                                           | Result                                                                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| The loader throws                                   | A 500 error page; the error is logged. Details are shown only in development.                           |
| The loader returns something that is not plain JSON | A 500. The message names the path, for example `loader data of 'page:/x'.joined is not a plain object`. |
| The loader returns `undefined`                      | A 500: `is undefined; JSON has no undefined (use null for no value)`.                                   |

## Tips

- Return only the fields the page needs. Loader data is written into the page source, so it is public. See [The server/client boundary](./server-client-boundary.md).
- Loaders run on every request. Gambrel has no built-in data cache.
- Several independent queries inside one loader can run together with `Promise.all`.
- Convert dates to strings before returning them.

For the exact resolution order and the full type reference, see [Router](./router.md).