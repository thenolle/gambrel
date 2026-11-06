# @gambrel/browser

Renders and hydrates components in the browser. It reads browser APIs only when called and takes the `document` from the container you give it.

```ts
import { hydrate, hydrateRoutes, mount } from '@gambrel/browser'
```

## hydrateRoutes

The entry point for a Gambrel app. Put it in `src/client.ts`:

```ts title="src/client.ts"
import { hydrateRoutes } from '@gambrel/browser'
import { components, routes } from '../.gambrel/manifest.client.ts'

try {
  hydrateRoutes({ routes, components })
} catch (error) {
  console.error('[gambrel] hydration failed; the server-rendered page stays as it is', error)
}
```

| Option       | Default                      | Meaning                                            |
| ------------ | ---------------------------- | -------------------------------------------------- |
| `routes`     | required                     | The client route table from the generated manifest |
| `components` | required                     | The page and layout components by entry id         |
| `document`   | the global `document`        | Use another document, for example in tests         |
| `pathname`   | `document.location.pathname` | The path to check the payload against              |
| `onMismatch` | logs with `console.error`    | Called for every hydration mismatch                |

What it does, in order:

1. Reads and validates the embedded payload.
2. Checks it against your route table (same path, route, params and layout chain).
3. Rebuilds the same component tree from the payload's params and data.
4. Hydrates the existing document.

Loaders and guards never run in the browser. On a payload error it throws `HydrationPayloadError` and **leaves the page untouched**.

## mount and hydrate

```ts
mount(container: Element, tree: Child): MountedRoot
hydrate(container: Element | Document, tree: Child, options?: { onMismatch?: (m: HydrationMismatch) => void }): HydratedRoot
```

| Function  | Behavior                                               | `dispose()`                                               |
| --------- | ------------------------------------------------------ | --------------------------------------------------------- |
| `mount`   | Clears the container and renders into it               | Stops updates, removes listeners and the nodes it created |
| `hydrate` | Adopts existing DOM and attaches listeners and effects | Stops updates and listeners, leaves the DOM               |

`hydrate` returns `{ dispose, mismatches }`, with every mismatch as `{ message, path }`.

## Hydration mismatches

Children are matched by position. Each mismatch is reported and repaired locally:

| Situation                         | Repair                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------- |
| A different element at a position | That subtree is replaced with client-rendered DOM. Siblings and ancestors stay. |
| Different text                    | The text node is corrected in place                                             |
| A missing node                    | It is created                                                                   |
| A leftover server node            | It is removed                                                                   |
| A different attribute             | It is set to the client value                                                   |

A report looks like `[gambrel] hydration mismatch at "html > body > main > p": expected <p> but found <div>`. The page is never remounted as a whole.

Text merged by the HTML parser is split during hydration. Doctype nodes and nodes marked `data-gambrel` (the payload and entry script) are skipped.

## Rendering rules

- Function children and function-valued attributes are live: they update when their signals change.
- `onClick`-style props attach listeners (event name is the rest of the prop in lower case) and are removed on dispose. A non-function value throws.
- `value`, `checked` and `selected` also set the DOM property.
- `ref={(element) => ...}` is called with the element after its children are rendered.
- A function child re-renders its whole region when it changes (no keyed diffing).
- Components run once and must be synchronous.

## Not supported

SVG namespaces, mounting directly on `document` (hydrating a `Document` is fine), and keyed list reconciliation.