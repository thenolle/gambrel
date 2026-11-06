# @gambrel/view

JSX runtime, VNodes and the server renderer. Configure TSX with `"jsx": "react-jsx"` and `"jsxImportSource": "@gambrel/view"`.

## Components

`(props) => Child | Promise<Child>`. `children` arrives in `props.children`. `Fragment` (`<>...</>`) groups children.

## Children

| Value                    | Output                       |
| ------------------------ | ---------------------------- |
| string, number           | escaped text (`String(n)`)   |
| null, undefined, boolean | nothing                      |
| array                    | each item, in order          |
| VNode                    | element or component output  |
| `raw(html)`              | the string, unescaped        |
| zero-argument function   | called once, result rendered |
| anything else            | `TypeError`                  |

## Attributes

- Names follow HTML: `class`, `for`. `className` and `htmlFor` throw.
- `true` writes a bare attribute, `false`, `null` and `undefined` omit it, numbers and strings are written escaped in double quotes. Use strings (`'true'`/`'false'`) for enumerated attributes such as `aria-hidden`.
- A function value is called once and its result serialized. Results that are not string, number, boolean or nullish throw.
- Props starting with `on` (any case), plus `key`, `ref` and `children`, are never written.
- Invalid tag or attribute names throw. URL-valued attributes are not sanitized.

## Raw text elements

`<script>` and `<style>` accept only `raw()` content. Void elements cannot have children.

## Rendering

`renderToString(child)` returns `Promise<string>`. Async components are awaited sequentially in document order. There is no streaming and no Suspense. Output contains no hydration markers: HTML parsers merge adjacent text nodes, and the browser runtime splits them when hydrating. Emit the doctype from the root layout with `raw('<!doctype html>')`.

## Events

`on*` props are typed with a minimal `ViewEvent`. Cast `currentTarget` in application code if you need DOM-specific members.