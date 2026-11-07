# @gambrel/browser

DOM rendering and hydration for Gambrel components.

## Install

```bash
bun add @gambrel/browser @gambrel/view @gambrel/reactivity
```

## Mount an interface

```tsx
/** @jsxImportSource @gambrel/view */
import { mount } from '@gambrel/browser'
import { signal } from '@gambrel/reactivity'

const count = signal(0)
const container = document.getElementById('app')

if (container === null) throw new Error('Missing application container')

const app = mount(
  container,
  <button onClick={() => count.update((value) => value + 1)}>
    {count}
  </button>
)
```

`app.dispose()` stops updates, removes listeners, and removes mounted content.

## Hydrate server HTML

Use `hydrate(container, tree)` to adopt existing markup.

For routed documents, use `hydrateRoutes({ routes, components })` with the generated client manifest. The browser validates the embedded route payload and uses server-provided data without running server hooks.

## Behavior

- Matching server nodes are preserved.
- Mismatches are reported and repaired locally.
- Function children and attributes track reactive reads.
- Event listeners are removed on disposal.
- SVG descendants use the SVG namespace.
- Dynamic child regions replace their contents when updated.

Hydration disposal stops behavior but preserves the DOM.

## Documentation

[Browser reference](https://thenolle.github.io/gambrel/#/browser)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.