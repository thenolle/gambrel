# @gambrel/router

Matching and resolution. The router has no DOM, `Request` or filesystem dependency.

## Patterns

| Pattern segment | Meaning                                                            |
| --------------- | ------------------------------------------------------------------ |
| `users`         | static                                                             |
| `[id]`          | dynamic, `string`                                                  |
| `[...slug]`     | catch-all, `readonly string[]`, one or more segments, must be last |

Precedence is decided at the first segment where two matching patterns differ: static, then dynamic, then catch-all. Trailing and doubled slashes are ignored and the query string is never matched. Malformed percent-encoding is a `bad-request`. `createMatcher` throws `RouteConfigError` for duplicate IDs, patterns that differ only in parameter names, misplaced catch-alls, invalid names, and an ID used by both a route and a layout.

## Route files (compiler convention, Phase 6)

- `page.tsx` and `layout.tsx`: components only, safe to import in the browser.
- `page.server.ts` and `layout.server.ts`: optional, export `loader` and/or `beforeLoad`. Imported by the server manifest only.

## Component contract

`PageComponent<P, D>` receives `{ params, data }`. `LayoutComponent<P, D>` also receives `children`. Components are synchronous so the same function renders on the server and hydrates in the browser. Each layout and page receives the data of its own loader.

## Hooks

`beforeLoad` is a `Guard`: return nothing to continue, or `redirect(location, status?)`, `deny(status?, message?)` or `notFound()`. `loader` is a `Loader`: return JSON data (`null` for none) or one of the same outcomes. Both receive `{ params, pathname, search, context }`, where `context` is supplied by the caller of `resolve`.

Use `ParamsOf<'/users/[id]'>` and `Loader<P, D, C>` to type hooks, and `LoaderData<typeof loader>` to type the page that consumes the data.

## Resolution

`resolve(matcher, hooks, { pathname, search?, context })`:

1. Match. Unmatched is `not-found`, malformed is `bad-request`.
2. Run every guard from the outermost layout to the page.
3. Run every loader in the same order, sequentially.

Result kinds: `page` (with `chain` of `{ id, kind, data }`), `redirect`, `denied`, `not-found`, `bad-request`, `error`. A thrown error or invalid return value becomes `error` with the original error, the entry ID and the phase. Nothing is swallowed.

## Loader data

Plain JSON only: `null`, booleans, strings, finite numbers, arrays and plain objects. `undefined`, functions, symbols, bigint, `NaN`, `Infinity`, `Date`, `Map`, `Set`, class instances and circular references are rejected with a path in the message (`assertJsonValue`).

## Server modules

`hooksFromModule(id, module)` turns a `*.server.ts` module namespace into `EntryHooks`. The module may export only `loader` and `beforeLoad` (functions), at least one. Any other export throws `RouteConfigError`. The generated server manifest calls it for every server file.