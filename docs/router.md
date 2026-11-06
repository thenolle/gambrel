# @gambrel/router

Route matching, resolution, outcomes, the hydration payload, and the types that tie routes to components. It has no HTTP, filesystem or DOM dependency.

## Patterns

| Segment     | Meaning                                       | Param type          |
| ----------- | --------------------------------------------- | ------------------- |
| `users`     | static                                        | n/a                 |
| `[id]`      | dynamic                                       | `string`            |
| `[...slug]` | catch-all, one or more segments, must be last | `readonly string[]` |

Static beats dynamic beats catch-all, compared from the left. A route record describes one page:

```ts
interface RouteRecord {
  id: string          // 'page:/users/[id]'
  pattern: string     // '/users/[id]'
  layouts: string[]   // ['layout:/', 'layout:/users'], outermost first
}
```

## createMatcher

```ts
const matcher = createMatcher(records)
matcher.match('/users/42')
// { kind: 'match', route, params: { id: '42' } }
// { kind: 'not-found' }
// { kind: 'malformed', reason }  (bad percent-encoding, or a path without a leading '/')
```

`createMatcher` throws `RouteConfigError` for duplicate ids, ambiguous patterns (such as `/u/[id]` and `/u/[name]`), a catch-all that is not last, invalid or duplicate param names, and an id used by both a route and a layout. `matcher.routes` lists the records sorted by id.

## resolve

```ts
const resolution = await resolve(matcher, hooks, { pathname, search, context })
```

It matches, runs every guard from the outermost layout to the page, then every loader in the same order. The result is one of:

| `kind`        | Fields                                                                   |
| ------------- | ------------------------------------------------------------------------ |
| `page`        | `route`, `pathname`, `params`, `chain` (per entry: `id`, `kind`, `data`) |
| `redirect`    | `location`, `status`                                                     |
| `denied`      | `status`, `message`                                                      |
| `not-found`   | none                                                                     |
| `bad-request` | `reason`                                                                 |
| `error`       | `error`, `entryId`, `phase` (`guard` or `loader`)                        |

`hooks` is a `Map` from entry id to `{ guard?, loader? }`.

## Guards and loaders

```ts
type Guard<Params, Context> = (ctx: HookContext<Params, Context>) => void | Outcome | Promise<void | Outcome>
type Loader<Params, Data extends JsonValue, Context> = (ctx: HookContext<Params, Context>) => Data | Outcome | Promise<Data | Outcome>
```

| Outcome   | Created with                                                 |
| --------- | ------------------------------------------------------------ |
| Redirect  | `redirect(location, status = 302)` (301, 302, 303, 307, 308) |
| Deny      | `deny(status = 403, message?)` (integer 400 to 599)          |
| Not found | `notFound()`                                                 |

Anything a guard returns other than nothing or an outcome is an `error`. Loader data must be plain JSON, checked by `assertJsonValue`; an invalid value produces an `error` that names the path.

## Types

| Type                                                | Use                                     |
| --------------------------------------------------- | --------------------------------------- |
| `ParamsOf<'/users/[id]'>`                           | `{ readonly id: string }`               |
| `LoaderData<typeof loader>`                         | The data type of a loader               |
| `PageProps<Params, Data>`                           | `{ params, data }`                      |
| `LayoutProps<Params, Data>`                         | `{ params, data, children }`            |
| `PageComponent`, `LayoutComponent`                  | Synchronous components                  |
| `HookContext<Params, Context>`                      | `{ params, pathname, search, context }` |
| `JsonValue`, `RouteParams`, `Resolution`, `Outcome` | Data and result types                   |

## Server modules

`hooksFromModule(id, module)` turns a `*.server.ts` module into hooks. The module may export only `loader` and `beforeLoad` (functions), at least one. Anything else throws `RouteConfigError`. The generated server manifest uses it.

## Hydration payload

| Function                                    | Use                                                                                                                   |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `createPayload(resolution)`                 | Build the payload for a resolved page                                                                                 |
| `serializePayload(payload)`                 | JSON safe inside a `<script type="application/json">`: `<`, `>`, `&`, U+2028 and U+2029 are written as `\uXXXX`       |
| `parsePayload(text)`                        | Strictly validate untrusted text. Unknown fields, wrong types and unsupported versions throw `HydrationPayloadError`. |
| `verifyPayload(payload, matcher, pathname)` | Check path, route id, params and layout chain against the client table                                                |
| `composeRoute(chain, components, params)`   | Build the component tree, used by both server and browser                                                             |

Constants: `HYDRATION_VERSION` (`1`), `PAYLOAD_ELEMENT_ID` (`gambrel-data`), `FRAMEWORK_ATTRIBUTE` (`data-gambrel`).

The payload is `{ version, routeId, pathname, params, chain: [{ id, kind, data }] }`. See [SSR and hydration](./ssr-hydration.md) for how it is used.

## JSON data

`assertJsonValue(value, label)` and `isJsonValue(value)` accept `null`, booleans, strings, finite numbers, arrays and plain objects. They reject `undefined`, functions, symbols, `bigint`, `NaN`, `Infinity`, `Date`, `Map`, `Set`, class instances and circular references.