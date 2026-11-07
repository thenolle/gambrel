# @gambrel/view

Gambrel's JSX runtime and server-side HTML renderer.

## Install

```bash
bun add @gambrel/view
```

## Render JSX

```tsx
/** @jsxImportSource @gambrel/view */
import { renderToString, type Child } from '@gambrel/view'

function Greeting(props: { name: string }): Child {
  return <p>Hello, {props.name}</p>
}

console.log(await renderToString(<Greeting name="Ada" />))
```

## TypeScript configuration

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gambrel/view"
  }
}
```

Use the JSX pragma in TSX entry files when the runtime or bundler does not inherit that configuration.

## Rendering behavior

- Text and attribute values are escaped.
- Null, undefined, and boolean children produce no content.
- Arrays and fragments preserve order.
- Event props are not emitted into HTML.
- Void elements cannot contain rendered children.
- Async components are awaited sequentially by `renderToString`.

Components used by the browser must be synchronous.

## Trusted HTML

`raw(html)` emits a trusted string without escaping. Never pass untrusted input to it.

Script and style contents require the explicit raw boundary.

## Entry points

- `@gambrel/view`
- `@gambrel/view/jsx-runtime`
- `@gambrel/view/jsx-dev-runtime`

## Documentation

[View reference](https://thenolle.github.io/gambrel/#/view)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.