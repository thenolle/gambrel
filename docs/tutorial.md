# Tutorial: a bookshelf

In this tutorial you build a small full-stack feature inside the example app: a list of books, a detail page for each book, a shared layout with data of its own, a button that works in the browser, and a JSON API. Each step shows what to create and what you should see.

You will use: file routes, dynamic routes, server loaders, a nested layout, a 404, a signal-driven component and a plain API route.

> [!NOTE]
> Work inside `examples/app`. If you have not run the example yet, do [Getting started](./getting-started.md) first, then start `bun run dev`.

## 1. Add some server-only data

Create the data module. It lives under `src/data/` and is only ever imported by `*.server.ts` files, so it never reaches the browser.

```ts title="src/data/books.ts"
export interface Book {
  readonly id: string
  readonly title: string
  readonly author: string
  readonly year: number
}

const books: readonly Book[] = [
  { id: '1', title: 'Structure and Interpretation of Computer Programs', author: 'Abelson and Sussman', year: 1985 },
  { id: '2', title: 'The Pragmatic Programmer', author: 'Hunt and Thomas', year: 1999 },
  { id: '3', title: 'Designing Data-Intensive Applications', author: 'Kleppmann', year: 2017 }
]

export function listBooks(): readonly Book[] {
  return books
}

export function findBook(id: string): Book | undefined {
  return books.find((book) => book.id === id)
}
```

## 2. The list page

A page has two files: the component (`page.tsx`) and an optional server file (`page.server.ts`) that loads its data.

```ts title="src/routes/books/page.server.ts"
import type { Context } from '@gambrel/core'
import type { Loader, ParamsOf } from '@gambrel/router'
import { listBooks } from '../../data/books.ts'

type BookSummary = { id: string; title: string }

export const loader: Loader<ParamsOf<'/books'>, { books: BookSummary[] }, Context> = () => ({
  books: listBooks().map((book) => ({ id: book.id, title: book.title }))
})
```

```tsx title="src/routes/books/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function BooksPage(props: PageProps<ParamsOf<'/books'>, LoaderData<typeof loader>>): Child {
  return (
    <section>
      <h1>Books</h1>
      <ul>
        {props.data.books.map((book) => (
          <li>
            <a href={`/books/${book.id}`}>{book.title}</a>
          </li>
        ))}
      </ul>
    </section>
  )
}
```

Restart `bun run dev` so the new routes are picked up, then open `http://localhost:3000/books`. You should see three links.

> [!TIP]
> The loader returns only what the page needs (`id` and `title`). Everything a loader returns is sent to the browser, so return the smallest useful shape.

## 3. The detail page and a 404

The folder `[id]` makes the segment dynamic. A loader can return `notFound()` to end the request with a 404 page.

```ts title="src/routes/books/[id]/page.server.ts"
import type { Context } from '@gambrel/core'
import { notFound, type Loader, type ParamsOf } from '@gambrel/router'
import { findBook } from '../../../data/books.ts'

type BookView = { id: string; title: string; author: string; year: number }

export const loader: Loader<ParamsOf<'/books/[id]'>, BookView, Context> = (ctx) => {
  const book = findBook(ctx.params.id)
  if (book === undefined) return notFound()
  return { id: book.id, title: book.title, author: book.author, year: book.year }
}
```

```tsx title="src/routes/books/[id]/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function BookPage(props: PageProps<ParamsOf<'/books/[id]'>, LoaderData<typeof loader>>): Child {
  return (
    <article>
      <h1>{props.data.title}</h1>
      <p>
        {props.data.author}, {props.data.year}
      </p>
    </article>
  )
}
```

Check it from the terminal:

```bash
curl -s http://localhost:3000/books/2 | grep -o '<h1>[^<]*</h1>'
curl -i http://localhost:3000/books/999
```

The first prints `<h1>The Pragmatic Programmer</h1>`. The second returns `404 Not Found`.

## 4. A layout with its own data

A `layout.tsx` wraps every page below it, and a `layout.server.ts` gives the layout its own loader. The layout and the page each get the data of their own loader, never each other's.

```ts title="src/routes/books/layout.server.ts"
import type { Context } from '@gambrel/core'
import type { Loader, ParamsOf } from '@gambrel/router'
import { listBooks } from '../../data/books.ts'

export const loader: Loader<ParamsOf<'/books'>, { total: number }, Context> = () => ({
  total: listBooks().length
})
```

```tsx title="src/routes/books/layout.tsx"
/** @jsxImportSource @gambrel/view */
import type { LayoutProps, LoaderData, RouteParams } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './layout.server.ts'

export default function BooksLayout(props: LayoutProps<RouteParams, LoaderData<typeof loader>>): Child {
  return (
    <div>
      <p>{props.data.total} books on the shelf</p>
      {props.children}
    </div>
  )
}
```

Reload `/books` and `/books/1`: both now show "3 books on the shelf" above the page. Order, from outside in, is the root layout, then `BooksLayout`, then the page.

## 5. Add something interactive

Components run in the browser too. Create a button that counts likes with a signal:

```tsx title="src/components/like-button.tsx"
/** @jsxImportSource @gambrel/view */
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'

export function LikeButton(): Child {
  const likes = signal(0)
  return (
    <button type="button" onClick={() => likes.update((count) => count + 1)}>
      Like ({likes})
    </button>
  )
}
```

Use it in the detail page, after the paragraph:

```tsx title="src/routes/books/[id]/page.tsx"
import { LikeButton } from '../../../components/like-button.tsx'

// inside the returned <article>, after the <p>:
<LikeButton />
```

Open a book, click the button, and the count goes up without a page reload. View the page source first: the server already rendered `Like (0)`. The browser reuses that HTML and only attaches the click handler.

## 6. A JSON API next to your pages

Pages are not the only thing the server can answer. Explicit routes added with `core` run before the page handler. Edit `src/app.ts`:

```ts title="src/app.ts"
import { listBooks } from './data/books.ts'

// in the createApp(...) chain, next to the health route:
.get('/api/books', () => json(listBooks()))
```

```bash
curl -s http://localhost:3000/api/books
```

## 7. Link to it and ship it

Add a link in the root layout (`src/routes/layout.tsx`) next to the others:

```tsx
<a href="/books">Books</a>
```

Now build and run the production version:

```bash
bun run build
bun run start
```

Then try the two checks that show why server rendering matters:

1. View source on `/books/1`. The title, author and a `gambrel-data` script are already in the HTML.
2. Disable JavaScript in your browser. The page still reads fine; only the Like button stops responding.

## What you used

| Step    | Feature                             | Read more                                                 |
| ------- | ----------------------------------- | --------------------------------------------------------- |
| 2 and 3 | Loaders, `notFound()`, typed params | [Router](./router.md)                                     |
| 4       | Nested layouts with per-layout data | [Routing and layouts](./routing.md)                       |
| 1 and 2 | Server-only files                   | [The server/client boundary](./server-client-boundary.md) |
| 5       | Signals and hydration               | [SSR and hydration](./ssr-hydration.md)                   |
| 7       | Production build                    | [Build and development](./build.md)                       |