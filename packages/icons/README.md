# @gambrel/icons

SVG icon components for Gambrel.

## Install

```bash
bun add @gambrel/icons @gambrel/view
```

## Use an icon

```tsx
/** @jsxImportSource @gambrel/view */
import { Check, Gambrel, Search } from '@gambrel/icons'

export function Header() {
  return (
    <header>
      <Gambrel size={28} title="Gambrel" />
      <Search size={16} />
      <Check size={16} />
    </header>
  )
}
```

## Props

| Prop          | Default                                          |
| ------------- | ------------------------------------------------ |
| `size`        | `24`                                             |
| `color`       | `currentColor`                                   |
| `strokeWidth` | `2`                                              |
| `class`       | No additional classes                            |
| `title`       | Decorative unless an accessible name is provided |

Additional attributes are forwarded to the SVG.

## Dynamic names

```tsx
import { Icon } from '@gambrel/icons/registry'

<Icon name="circle-check" size={20} />
```

The registry entry includes the whole collection. Prefer named imports when you know which icons you need.

## Custom icons

`createIcon(name, shapes)` creates a component using the same props and accessibility behavior.

`renderIconSvg(shapes, options)` returns standalone SVG markup.

## Explore

[Search the catalog](https://thenolle.github.io/gambrel/icons.html)

[Icon reference](https://thenolle.github.io/gambrel/#/icons)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.