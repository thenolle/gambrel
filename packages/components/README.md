# @gambrel/components

Themeable Gambrel UI components with plain CSS.

## Install

```bash
bun add @gambrel/components @gambrel/view
```

## Use a component

```tsx
/** @jsxImportSource @gambrel/view */
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@gambrel/components'

export function Welcome() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Continue</Button>
      </CardContent>
    </Card>
  )
}
```

## Load the stylesheet

The package exports `@gambrel/components/styles.css`.

Include it through your application's CSS pipeline, or copy it to a public asset during a Bun build:

```ts
import { copyFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const source = fileURLToPath(
  import.meta.resolve('@gambrel/components/styles.css')
)

await copyFile(source, 'dist/client/components.css')
```

Create the destination directory first. Link the served file once in the root document:

```html
<link rel="stylesheet" href="/assets/components.css">
```

## Component families

- Buttons, badges, cards, alerts, and typography
- Native form controls and linked fields
- Search, password, numeric, and file inputs
- Tabs, accordions, collapsibles, and toggle groups
- Dialogs, sheets, popovers, tooltips, and menus
- Commands and searchable selection
- Navigation, sidebars, toolbars, and application states
- Tables, client-side data tables, pagination, and progress
- Toast notifications and loading indicators

## State and accessibility

Interactive components support their documented controlled and uncontrolled props. Linked patterns use explicit IDs; use a distinct ID for each instance.

Native dialog behavior requires browser support for `showModal()`.

## Styling

Colors use CSS custom properties such as `--primary`, `--background`, `--border`, and `--ring`. Dark mode uses `.dark` or `[data-theme="dark"]`.

The package uses `gb-*` classes. Tailwind is not required.

## Documentation

[Components](https://thenolle.github.io/gambrel/#/components)

[Forms](https://thenolle.github.io/gambrel/#/component-forms)

[Application UI](https://thenolle.github.io/gambrel/#/component-application)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.