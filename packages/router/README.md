# @gambrel/router

Deterministic route matching, guards, loaders, layout composition, and hydration data.

## Install

```bash
bun add @gambrel/router
```

## Match a route

```ts
import { createMatcher } from '@gambrel/router'

const matcher = createMatcher([
  {
    id: 'page:/users/[id]',
    pattern: '/users/[id]',
    layouts: []
  }
])

console.log(matcher.match('/users/42'))
```

## Patterns

| Segment     | Meaning                      |
| ----------- | ---------------------------- |
| `users`     | Static segment               |
| `[id]`      | One decoded string parameter |
| `[...slug]` | One or more decoded segments |

Static segments outrank dynamic segments, which outrank catch-alls.

## Typed loaders

```ts
import { notFound, type Loader, type ParamsOf } from '@gambrel/router'

export const loader: Loader<
  ParamsOf<'/users/[id]'>,
  { id: string }
> = ({ params }) => {
  if (params.id === 'missing') return notFound()
  return { id: params.id }
}
```

Guards return nothing to continue, or an explicit `redirect`, `deny`, or `notFound` outcome.

All guards run before loaders. Layouts and pages retain separate loader data.

## Component types

- `PageProps<Params, Data>`
- `LayoutProps<Params, Data>`
- `ParamsOf<Pattern>`
- `LoaderData<typeof loader>`

## Serialization

Loader data must be plain JSON. The package provides validation and versioned hydration payload helpers.

## Documentation

[Router reference](https://thenolle.github.io/gambrel/#/router)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.