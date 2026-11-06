# @gambrel/view

The JSX runtime and the server renderer. It renders to HTML strings, escapes everything by default, and has no dependency on the DOM or on Bun.

## Setup

```json title="tsconfig.json"
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gambrel/view"
  }
}
```

Also put `/** @jsxImportSource @gambrel/view */` at the top of each `.tsx` file. The bundler and test runner read the pragma reliably.

## Components

A component is a function from props to a child. `children` arrives in `props.children`.

```tsx
/** @jsxImportSource @gambrel/view */
import { renderToString, type Child } from '@gambrel/view'

function Greeting(props: { name: string }): Child {
  return <p>Hello, {props.name}</p>
}

const html = await renderToString(<Greeting name="Ada" />) // <p>Hello, Ada</p>
```

Components may be `async` when you render with `renderToString` alone. Route components must be synchronous, because they also run in the browser.

## What can be a child

| Value                                | Output                                                  |
| ------------------------------------ | ------------------------------------------------------- |
| string, number                       | Escaped text (`String(n)` for numbers, so `0` is shown) |
| `null`, `undefined`, `true`, `false` | Nothing                                                 |
| array                                | Each item in order                                      |
| element or component                 | Its output                                              |
| `raw(html)`                          | The string, **not** escaped                             |
| a function with no arguments         | Called once; its result is rendered                     |
| anything else                        | A `TypeError`                                           |

Adjacent text is not separated in the output. The browser runtime accounts for this when hydrating.

## Attributes

| Value                                   | Output                                      |
| --------------------------------------- | ------------------------------------------- |
| string                                  | `name="value"`, escaped                     |
| number                                  | `name="5"` (must be finite)                 |
| `true`                                  | A bare attribute: `disabled`                |
| `false`, `null`, `undefined`            | Omitted                                     |
| a function                              | Called once; the result follows these rules |
| anything else (objects, symbols, `NaN`) | A `TypeError` naming the attribute          |

- Use HTML names: `class` and `for`. `className` and `htmlFor` throw and tell you what to use.
- Props starting with `on` (any case) are event handlers and are **never** written to HTML. This includes a lowercase `onclick="..."` string.
- `key`, `ref` and `children` are reserved and never written.
- Attribute and element names are validated, so spread props cannot inject markup.
- For attributes that need the text `true` or `false` (such as `aria-hidden`), pass strings.

## Raw HTML

`raw(html)` is an explicit trusted escape hatch. Never pass user input to it.

```tsx
<div>{raw('<b>trusted</b>')}</div>
```

Inside `<script>` and `<style>` only `raw()` content is allowed. A plain string child there throws, which stops accidental `</script>` breakouts.

## renderToString

```ts
renderToString(child: Child): Promise<string>
```

- Async components are awaited **one after another in document order**, so output never depends on timing.
- Void elements (`br`, `img`, `input`, ...) have no closing tag and cannot have children.
- There is no streaming and no Suspense.
- No browser globals are read.

## JSX types

| Rule                    | Detail                                                              |
| ----------------------- | ------------------------------------------------------------------- |
| Any tag name is allowed | Intrinsic elements accept any element name                          |
| `class`, `id`, `style`  | A string, `null`, `undefined`, or a function returning one of those |
| `on...` props           | `(event: ViewEvent) => void`                                        |
| Other attributes        | Accepted and validated when rendered                                |
| Component props         | Typed by the component's own signature                              |
| `key`                   | Accepted on any element                                             |

`ViewEvent` is a small structural type (`type`, `target`, `currentTarget`, `preventDefault()`, `stopPropagation()`). Cast `currentTarget` to the element type you know.

## Other exports

| Export                                                                                    | Use                                                                         |
| ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `createElement(type, props, key?)`                                                        | The element factory behind JSX                                              |
| `Fragment`                                                                                | Group children without a wrapper (`<>...</>`)                               |
| `escapeText`, `escapeAttribute`                                                           | The escaping used by the renderer                                           |
| `isVNode`, `isRawHtml`, `isChildArray`, `describeType`                                    | Guards and helpers                                                          |
| `normalizeAttribute`, `assertAttributeName`, `isEventProp`, `isReservedProp`, `eventType` | Shared rules used by `@gambrel/browser`. Not intended for application code. |

Types: `Child`, `Component`, `Props`, `VNode`, `RawHtml`, `Reactive`, `EventHandler`, `ViewEvent`, `HtmlProps`, `JSX`.