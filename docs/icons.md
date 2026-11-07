# @gambrel/icons

A hand-drawn SVG icon library. Every icon is a small tree-shakable component, generated from a plain `.svg` file, drawn on a 24 by 24 grid with a 2px round stroke.

## Use an icon

```tsx
/** @jsxImportSource @gambrel/view */
import { ArrowRight, Check } from '@gambrel/icons'

export function Done() {
  return (
    <p>
      <Check size={16} /> Saved <ArrowRight size={16} />
    </p>
  )
}
```

Icons render inline SVG, so they work in server rendering, hydrate without mismatches, and can appear inside reactive regions.

| Prop          | Default        | Meaning                                                |
| ------------- | -------------- | ------------------------------------------------------ |
| `size`        | `24`           | Width and height in pixels, or any CSS length          |
| `color`       | `currentColor` | Stroke color. Icons follow the text color.             |
| `strokeWidth` | `2`            | Stroke width on the 24 by 24 grid                      |
| `class`       | none           | Extra classes, after `gb-icon gb-icon-<name>`          |
| `title`       | none           | An accessible name. Adds a `<title>` and `role="img"`. |

Any other prop is passed to the `<svg>` element. Without `title` or `aria-label`, an icon is hidden from assistive technology (`aria-hidden`).

## Use an icon by name

```tsx
import { Icon } from '@gambrel/icons/registry'

<Icon name="circle-check" />
```

`@gambrel/icons/registry` includes every icon in your bundle. Prefer the named components when you only need a few.

## Add an icon

1. Draw it on a 24 by 24 grid and save it as `packages/icons/svg/<name>.svg`.
2. Run `bun run --filter @gambrel/icons generate`.
3. Use `<MyIcon />`. The name `my-icon` becomes the component `MyIcon`.

```text title="packages/icons/svg/sparkle.svg"
<svg viewBox="0 0 24 24">
  <path d="m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2Z"/>
</svg>
```

The generator checks every file and reports all problems together:

| Rule                                                                    | Why                                     |
| ----------------------------------------------------------------------- | --------------------------------------- |
| The file name is kebab-case                                             | It becomes the component name           |
| The root is `<svg viewBox="0 0 24 24">`                                 | One grid for every icon                 |
| Only `path`, `circle`, `ellipse`, `rect`, `line`, `polyline`, `polygon` | Predictable and safe                    |
| Self-closing shapes with geometry attributes only                       | No `fill`, `stroke`, `style` or scripts |
| Path data uses path commands and numbers only                           | Nothing executable can hide in it       |

Draw dots as a zero-length line, for example `M12 12h.01`: the round cap makes them a dot.

### See what you drew

```bash
bun run --filter @gambrel/icons preview
```

This writes `packages/icons/preview.html`, a page with every icon and sliders for size and stroke width.

### One-off icons

`createIcon(name, shapes)` makes a component that behaves like the built-in ones:

```tsx
import { createIcon } from '@gambrel/icons'

export const Logo = createIcon('logo', [['circle', { cx: '12', cy: '12', r: '8' }]])
```

`renderIconSvg(shapes, options)` returns a standalone SVG string with `xmlns`, for files or emails.

## Keeping it consistent

The generated modules are committed. A test fails if the `svg/` folder and the generated code ever differ, so run `generate` after changing a file.