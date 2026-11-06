# Cheat sheet

Everything you look up often, on one page.

## Files

| File                                 | Runs on            | Purpose                                 |
| ------------------------------------ | ------------------ | --------------------------------------- |
| `src/routes/**/page.tsx`             | server and browser | A page component                        |
| `src/routes/**/layout.tsx`           | server and browser | A layout component, receives `children` |
| `page.server.ts`, `layout.server.ts` | server only        | `loader` and `beforeLoad`               |
| `src/app.ts`, `src/server.ts`        | server only        | Compose and start the application       |
| `src/client.ts`                      | browser only       | Calls `hydrateRoutes`                   |
| `gambrel.config.ts`                  | build time         | Optional configuration                  |

## Route folder names

| Name             | URL effect                      | Param type          |
| ---------------- | ------------------------------- | ------------------- |
| `users`          | `/users`                        | n/a                 |
| `[id]`           | one segment                     | `string`            |
| `[...slug]`      | one or more segments, last only | `readonly string[]` |
| `(group)`        | none                            | n/a                 |
| `_name`, `.name` | ignored with its contents       | n/a                 |

## Commands

| Command              | Does                                            |
| -------------------- | ----------------------------------------------- |
| `bun install`        | Install and link the workspace                  |
| `bun run typecheck`  | Generate manifests and type-check everything    |
| `bun test`           | Run all tests                                   |
| `bun run dev`        | Development server, rebuilds the browser bundle |
| `bun run build`      | Production build into `dist/`                   |
| `bun run start`      | Run the built server                            |
| `bun run docs`       | Serve these docs on port 4000                   |
| `bun run docs:build` | Static docs site in `website/dist`              |

## Pages, layouts and hooks

```tsx
export default function Page(props: PageProps<ParamsOf<'/users/[id]'>, LoaderData<typeof loader>>): Child
export default function Layout(props: LayoutProps<RouteParams, LoaderData<typeof loader>>): Child

export const beforeLoad: Guard<ParamsOf<'/x'>, Context> = (ctx) => undefined
export const loader: Loader<ParamsOf<'/x'>, { name: string }, Context> = (ctx) => ({ name: 'Ada' })
```

| Return from a hook     | Effect                      |
| ---------------------- | --------------------------- |
| nothing (guards)       | continue                    |
| JSON data (loaders)    | becomes `data`              |
| `redirect('/to', 302)` | redirect                    |
| `deny(403, 'message')` | error page with that status |
| `notFound()`           | 404 page                    |

## Imports by package

| Need                                                                                                               | Import from           |
| ------------------------------------------------------------------------------------------------------------------ | --------------------- |
| `createApp`, `json`, `text`, `html`, `redirect` (Response)                                                         | `@gambrel/core`       |
| `serve`, `staticFiles`                                                                                             | `@gambrel/bun`        |
| `renderToString`, `raw`, `Child`, `Fragment`                                                                       | `@gambrel/view`       |
| `signal`, `effect`, `batch`, `untrack`, `root`, `onCleanup`                                                        | `@gambrel/reactivity` |
| `mount`, `hydrate`, `hydrateRoutes`                                                                                | `@gambrel/browser`    |
| `redirect`, `deny`, `notFound` (outcomes), `Loader`, `Guard`, `PageProps`, `LayoutProps`, `ParamsOf`, `LoaderData` | `@gambrel/router`     |
| `createDocumentHandler`                                                                                            | `@gambrel/ssr`        |
| `buildApp`, `buildClient`, `generateRoutes`, `defineConfig`, `loadConfig`                                          | `@gambrel/compiler`   |

## Statuses

| Status              | When                                              |
| ------------------- | ------------------------------------------------- |
| 200                 | A page rendered (HEAD: same without a body)       |
| 301 302 303 307 308 | A redirect from a guard or loader                 |
| 400                 | Malformed percent-encoding in the path            |
| 403 or your status  | `deny()`                                          |
| 404                 | No route, `notFound()`, or a missing asset        |
| 405                 | A method other than GET or HEAD on a page         |
| 500                 | Thrown error, invalid loader data, render failure |

## Environment

| Variable             | Default       | Meaning                           |
| -------------------- | ------------- | --------------------------------- |
| `NODE_ENV`           | unset         | `development` shows error details |
| `PORT`               | `3000`        | Listen port                       |
| `GAMBREL_CLIENT_DIR` | `dist/client` | Browser assets directory          |
| `DOCS_PORT`          | `4000`        | Port of `bun run docs`            |

## TypeScript setup

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gambrel/view"
  }
}
```

Put `/** @jsxImportSource @gambrel/view */` at the top of every `.tsx` file as well.