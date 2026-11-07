# @gambrel/components

Accessible, themeable UI components in the style of shadcn/ui. They are plain functions that render the same HTML on the server and in the browser, styled by one CSS file with no build step for you.

## Use them

```tsx
/** @jsxImportSource @gambrel/view */
import { Button, Card, CardContent, CardHeader, CardTitle } from '@gambrel/components'

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline">Get started</Button>
      </CardContent>
    </Card>
  )
}
```

Load the stylesheet once in your root layout. `@gambrel/components/styles.css` is a normal file, so serve it with `staticFiles` or place its content in a `<style>` tag:

```ts
app.use(staticFiles({ directory: 'node_modules/@gambrel/components/src', prefix: '/components' }))
```

```tsx
<link rel="stylesheet" href="/components/styles.css" />
```

## Theming

Colors come from CSS variables that hold HSL triplets, as in shadcn/ui: `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`, and `--radius`. Dark mode applies when an ancestor has `data-theme="dark"` or the class `dark`. Override any variable to retheme:

```css
:root { --primary: 262 83% 58%; --radius: 0.75rem; }
```

## Components

| Component                                                                         | Notes                                                                                            |
| --------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `Button`                                                                          | `variant`: default, secondary, destructive, outline, ghost, link. `size`: default, sm, lg, icon. |
| `Badge`                                                                           | `variant`: default, secondary, destructive, outline.                                             |
| `Card`, `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter` | Structure for grouped content                                                                    |
| `Alert`, `AlertTitle`, `AlertDescription`                                         | `variant`: default, destructive. Put an icon first.                                              |
| `Input`, `Textarea`, `Label`                                                      | Form basics. Link a label with `for`.                                                            |
| `Separator`                                                                       | `orientation`, `decorative` (default true)                                                       |
| `Skeleton`, `Spinner`, `Progress`                                                 | Loading and progress. `Progress` takes a number or a signal.                                     |
| `Kbd`                                                                             | A keyboard key                                                                                   |

Every component accepts `class`, `children`, and any other attribute, which is passed to the root element.

## Variants of your own

`variants()` builds a function from choices to class names. Each component exports its own, such as `buttonVariants`, so a link can look like a button:

```tsx
<a href="/docs" class={buttonVariants({ variant: 'secondary', size: 'lg' })}>Read the docs</a>
```

## Add a component

1. Create `src/components/<name>.tsx`. For a simple wrapper, one line is enough:

   ```tsx
   export const Callout = createPart('aside', 'gb-callout')
   ```

2. Create `styles/<name>.css` with the `.gb-<name>` rules, using the design tokens for colors.
3. Export it from `src/index.ts`.
4. Run `bun run --filter @gambrel/components build:css`.
5. Add a test. The stylesheet tests fail if a class has no CSS or if `src/styles.css` is out of date.

## Rules the components follow

- Class names are `gb-*`. They never depend on utility classes.
- No generated IDs. Anything linked by ID takes it from a prop, so the server and browser always agree.
- State works controlled or uncontrolled: pass `value`, or a signal, to control it from outside.
- Colors only come from the tokens.