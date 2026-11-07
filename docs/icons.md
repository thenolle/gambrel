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

## Expanded categories

The library includes an additional batch of 104 drawings across eight categories:

| Category              | Examples                                                   |
| --------------------- | ---------------------------------------------------------- |
| Files and development | FilePlus, FileSearch, FolderOpen, GitMerge, TerminalSquare |
| Navigation and layout | PanelRight, LayoutRows, CornerUpLeft, MoveHorizontal       |
| Forms and editing     | ClipboardCheck, ListOrdered, TextCursor, Eraser            |
| Communication         | MessageCircle, MailOpen, PhoneIncoming, Inbox              |
| Media                 | Camera, Video, Music, Headphones, Film                     |
| Commerce              | Receipt, Wallet, Store, Truck, Gift                        |
| Status                | CircleMinus, BadgeCheck, Timer, Hourglass                  |
| Devices               | Laptop, Router, Bluetooth, Plug, Battery                   |

Use named imports:

```tsx
/** @jsxImportSource @gambrel/view */
import { FilePlus, MessageCircle, Receipt } from '@gambrel/icons'

export function Actions() {
  return (
    <div>
      <button type="button">
        <FilePlus size={16} />
        New file
      </button>
      <button type="button" aria-label="Messages">
        <MessageCircle size={16} />
      </button>
      <Receipt size={20} title="Receipt" />
    </div>
  )
}
```

Named icon components use PascalCase. The registry uses the corresponding kebab-case names, such as `file-plus`.

Regenerate after editing SVG sources:

```bash
bun run --filter @gambrel/icons generate
bun run --filter @gambrel/icons preview
```

Automated validation checks structure, generated exports and rendering. Review the preview visually before releasing changed drawings.

## Additional interface icons

The collection includes Accessibility, AlarmClock, Anchor, Award, Briefcase,
CalendarCheck, CalendarDays, CloudDownload, CloudUpload, Compass, FileLock,
Fingerprint, Gauge, GraduationCap, Network, ScanLine and Workflow.

Use the icon catalog to search all available names and inspect their drawings.

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

## Browse the icon catalog

Open `icons.html` on the documentation site, or use the Icons link in its header.

The catalog supports:

- Search by name, component name and keywords
- Category filtering
- Live size, stroke-width and color controls
- Copy import, JSX and standalone SVG

The catalog is a static page. It works on GitHub Pages without a server process.

## Maintain catalog metadata

`packages/icons/catalog.config.json` is the maintained metadata source.

Ordered prefix rules classify names. Unmatched names use the explicit `general` category. Add an override for a specific icon when it needs another category or useful search synonyms.

```json
{
  "search": {
    "category": "navigation",
    "keywords": ["find", "lookup", "magnifier"]
  }
}
```

Overrides must refer to existing SVG files and declared categories. Catalog generation fails on invalid metadata.

The website generates `icons.json` from validated SVG sources. Applications importing individual icons do not load this catalog.

## Validation boundaries

The authoring validator rejects duplicate attributes, unexpected root attributes, unsupported shapes, malformed attributes and negative dimensions.

This is structural validation, not a full SVG path grammar checker. Use the preview or catalog to inspect drawings visually before publishing.

## Library sources versus standalone SVG files

Files under `packages/icons/svg/` are geometry-only sources for the generator:

```svg
<svg viewBox="0 0 24 24">
  <path d="M2 12h20"/>
</svg>
```

Do not add `fill`, `stroke`, `stroke-width`, `role`, or accessible labels to these files. The generated component supplies presentation and accessibility attributes.

Standalone SVG files, such as the website logo and favicon, are separate assets. They may contain their own presentation attributes and use a different viewBox.

The Gambrel brand assets live at:

- `packages/icons/svg/gambrel.svg`: outline component source
- `website/public/gambrel.svg`: filled website logo
- `website/public/favicon.svg`: browser-tab icon