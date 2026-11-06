# @gambrel/browser

## API

- `mount(container: Element, tree)` clears `container` and renders `tree`. `dispose()` stops reactivity, removes listeners and removes the created nodes.
- `hydrate(container: Element | Document, tree, { onMismatch? })` adopts existing DOM. Returns `{ dispose, mismatches }`. `dispose()` stops reactivity and listeners and leaves the DOM.

The document comes from the container. The runtime reads no browser global.

## Rendering

- Function children and function-valued attributes are tracked and update in place.
- A dynamic child region gets two empty comment markers on the client and re-renders its whole content on change. There is no keyed diffing.
- `on*` props attach listeners (`onClick` becomes `click`) and are removed on disposal. A non-function value throws.
- `value`, `checked` and `selected` also set the DOM property.
- `ref` is called with the element after its children render.
- Components run once, untracked. Async components throw in the browser.
- Not supported: SVG namespaces, mounting on `document`.

## Hydration mismatch policy

Server children are matched positionally. Every mismatch is passed to `onMismatch` (default `console.error`) and listed in `mismatches`.

| Situation                       | Repair                                                                |
| ------------------------------- | --------------------------------------------------------------------- |
| Different element at a position | That node is replaced by client DOM. Siblings and ancestors are kept. |
| Text differs                    | The text node is corrected in place.                                  |
| Missing node                    | It is created.                                                        |
| Leftover server node            | It is removed.                                                        |
| Attribute differs               | The attribute is set to the client value.                             |

Adjacent text merged by the HTML parser is split during hydration. Doctype nodes are skipped.