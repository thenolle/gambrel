# @gambrel/components

Accessible, themeable UI components in the style of shadcn/ui. They are plain functions that render the same HTML on the server and in the browser, styled by one CSS file with no build step for you.

## Use them

For linked fields, password/search/number inputs, uploads and a complete form example, see [Form components](./component-forms.md).

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
| `Checkbox`, `Radio`, `RadioGroup`, `Select`                                       | Native controls, styled. See below.                                                              |
| `Switch`, `Toggle`                                                                | On/off controls with `role="switch"` and `aria-pressed`                                          |
| `Tabs`, `Accordion`, `Collapsible`                                                | Disclosure patterns with full keyboard and ARIA support                                          |
| `Avatar`, `AvatarImage`, `AvatarFallback`                                         | The image hides itself if it fails, revealing the fallback                                       |
| `Breadcrumb` and its parts                                                        | `BreadcrumbList`, `BreadcrumbItem`, `BreadcrumbLink`, `BreadcrumbPage`, `BreadcrumbSeparator`    |
| `Table` and its parts                                                             | `Table` scrolls horizontally when too wide                                                       |
| `AspectRatio`                                                                     | `ratio` is width divided by height                                                               |
| `Separator`, `Skeleton`, `Spinner`, `Progress`, `Kbd`                             | Layout, loading and progress                                                                     |
| `Dialog`, `AlertDialog`, `Sheet`                                                  | Modal overlays built on the native `<dialog>` element                                            |
| `Popover`, `Tooltip`, `DropdownMenu`                                              | Floating content next to a trigger                                                               |
| `Toaster`, `toast()`                                                              | Notifications                                                                                    |
| `Pagination`, `Slider`, `ScrollArea`                                              | Navigation, range input and a scrollable region                                                  |
| `H1` to `H4`, `P`, `Lead`, `Muted`, `Blockquote`, `InlineCode`                    | Typography                                                                                       |

Every component accepts `class`, `children`, and any other attribute, which is passed to the root element.

## Stateful components

Tabs, Accordion, Radio group and Select are described by data instead of nested child components, because they work the same on the server and in the browser without any hidden shared state.

```tsx
<Tabs
  id="account"
  items={[
    { value: 'profile', label: 'Profile', content: <ProfileForm /> },
    { value: 'billing', label: 'Billing', content: <BillingForm /> }
  ]}
/>

<Accordion
  id="faq"
  type="multiple"
  items={[{ value: 'what', title: 'What is Gambrel?', content: 'A small framework.' }]}
/>

<RadioGroup name="plan" defaultValue="free" options={[{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }]} />
<Select placeholder="Country" options={[{ value: 'fr', label: 'France' }]} />
```

Each component works uncontrolled (give it `defaultValue`) or controlled (give it `value` as a value or a signal, and listen with `onValueChange`):

```tsx
const plan = signal('free')

<RadioGroup name="plan" value={plan} onValueChange={(value) => plan.set(value)} options={options} />
```

Tabs, Accordion and Collapsible build element ids from their `id` prop and each item's `value`. Use short, id-safe values (letters, digits, hyphens) and a distinct `id` for each component on a page.

Tabs follow the ARIA pattern: the arrow keys, Home and End move between enabled tabs. A `Switch` is a button with `role="switch"`: it does not submit a form value, so use `Checkbox` for form fields.

## Variants of your own

`variants()` builds a function from choices to class names. Each component exports its own, such as `buttonVariants`, so a link can look like a button:

```tsx
<a href="/docs" class={buttonVariants({ variant: 'secondary', size: 'lg' })}>Read the docs</a>
```

## Overlays

Dialog, Alert dialog and Sheet use the native `<dialog>` element, so the browser provides the focus trap, Escape handling and the inert page behind. They render closed on the server and open after the page is interactive.

```tsx
<Dialog
  id="edit"
  trigger={<Button>Edit profile</Button>}
  title="Edit profile"
  description="Make changes and save."
  footer={(close) => <Button onClick={close}>Done</Button>}
>
  <Input placeholder="Name" />
</Dialog>
```

`trigger` is an element (wrapped in a clickable span) or a function that receives the props to spread on your own trigger, which gives it the right ARIA attributes:

```tsx
<Popover id="filters" trigger={(props) => <Button variant="outline" {...props}>Filters</Button>}>
  Choose filters here.
</Popover>
```

`AlertDialog` asks for a decision (`cancelLabel`, `actionLabel`, `onAction`, `destructive`), and `Sheet` docks to a `side`. Control any overlay with `open` and `onOpenChange`, or let it manage itself with `defaultOpen`.

`Popover` and `DropdownMenu` are positioned with CSS using `side` and `align`; they do not move to avoid the edge of the viewport. They close on Escape and on a press outside. The menu is described by data:

```tsx
<DropdownMenu
  id="account"
  trigger={(props) => <Button variant="ghost" {...props}>Account</Button>}
  items={[
    { type: 'label', label: 'Signed in' },
    { label: 'Profile', shortcut: 'P', onSelect: () => openProfile() },
    { type: 'separator' },
    { label: 'Sign out', destructive: true, onSelect: () => signOut() }
  ]}
/>
```

ArrowUp, ArrowDown, Home and End move between items, and Escape returns focus to the trigger.

`Tooltip` wraps the element that gets the hint and shows it on hover and keyboard focus:

```tsx
<Tooltip id="save-hint" content="Save your work" side="bottom"><Button>Save</Button></Tooltip>
```

## Toasts

Render one `<Toaster />` in your root layout, then call `toast()` from event handlers in the browser:

```tsx
import { Button, toast, Toaster } from '@gambrel/components'

<Toaster position="bottom-right" />
<Button onClick={() => toast({ title: 'Saved', description: 'Your changes are live.' })}>Save</Button>
```

`toast()` returns an id for `dismissToast(id)`. Options are `title`, `description`, `variant` (`default` or `destructive`) and `duration` in milliseconds (`0` keeps it until dismissed, default 4000).

> [!WARNING]
> `toast()` throws if it runs while rendering on the server, because a shared store would leak between requests. Call it from handlers. `createToasts()` gives you an independent store.

## Pagination

`Pagination` renders real links, so it works without JavaScript:

```tsx
<Pagination page={3} pageCount={12} href={(page) => `/posts?page=${page}`} />
```

`paginationRange(page, pageCount, siblings)` returns the numbers and `'ellipsis'` markers if you want to build your own.

## Application UI

See [Application UI](./component-application.md) for Command, Combobox, navigation and sidebar primitives, Toolbar, EmptyState, StatCard, DescriptionList, Stepper and DataTable.

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