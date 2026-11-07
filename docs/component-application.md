# Application UI components

These components provide common application structures without adding a router, remote cache or server API.

## Command

Command is an inline searchable action list. Put it inside Dialog when you need a modal command palette.

```tsx
<Command
  id="project-actions"
  items={[
    {
      value: 'create',
      label: 'Create project',
      group: 'Projects',
      keywords: ['new'],
      onSelect: () => console.log('Create')
    },
    { value: 'archive', label: 'Archive project', disabled: true }
  ]}
/>
```

Arrow keys, Home and End move the active item. Enter invokes it. Focus remains in the search field. IDs must be distinct on the page.

## Combobox

```tsx
const country = signal('fr')

<Combobox
  id="billing-country"
  label="Billing country"
  name="country"
  value={country}
  onValueChange={country.set}
  options={[
    { value: 'fr', label: 'France' },
    { value: 'gb', label: 'United Kingdom' }
  ]}
/>
```

The visible input provides search; the hidden input submits the selected value. Typing is not selection. Blur restores the selected label.

Use defaultValue for uncontrolled state. Empty string means no selection and cannot be an option value.

Combobox supports keyboard selection, Escape, disabled options, and uncontrolled form resets. It does not implement remote searching or virtualization.

For a native mobile picker or browser-native required validation, use Select instead.

## Navigation and sidebar

```tsx
<NavigationMenu aria-label="Primary">
  <NavigationList>
    <NavigationItem>
      <NavigationLink href="/projects" aria-current="page">Projects</NavigationLink>
    </NavigationItem>
  </NavigationList>
</NavigationMenu>

<Sidebar aria-label="Workspace">
  <SidebarHeader>My workspace</SidebarHeader>
  <SidebarContent>
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarLink href="/projects">All projects</SidebarLink>
    </SidebarGroup>
  </SidebarContent>
  <SidebarFooter>Account</SidebarFooter>
</Sidebar>
```

These render ordinary HTML and links. They do not intercept navigation. Sidebar is structural; use Sheet for a mobile overlay.

Toolbar and ToolbarGroup are flex-layout wrappers. Buttons retain their ordinary native tab order.

## Empty and descriptive states

```tsx
<EmptyState
  title="No projects yet"
  description="Create a project to begin."
  action={<Button>Create project</Button>}
/>

<StatCard label="Active projects" value={12} detail="Across all workspaces" />

<DescriptionList
  items={[
    { term: 'Owner', description: 'Nolly' },
    { term: 'Visibility', description: 'Private' }
  ]}
/>
```

Use EmptyState for an actual empty result, not while data is still loading.

## Stepper

```tsx
<Stepper
  current="details"
  items={[
    { value: 'details', label: 'Details' },
    { value: 'review', label: 'Review' },
    { value: 'complete', label: 'Complete' }
  ]}
/>
```

Stepper displays progress only. It does not validate forms or advance automatically. The current prop accepts a string or an accessor.

## DataTable

```tsx
interface UserRow {
  name: string
  projects: number
}

const columns: readonly DataColumn<UserRow>[] = [
  {
    id: 'name',
    header: 'Name',
    text: (row) => row.name,
    compare: (a, b) => a.name.localeCompare(b.name)
  },
  {
    id: 'projects',
    header: 'Projects',
    text: (row) => String(row.projects),
    compare: (a, b) => a.projects - b.projects
  }
]

<DataTable
  caption="Workspace users"
  rows={users}
  columns={columns}
  pageSize={10}
/>
```

Import DataColumn as a type from @gambrel/components.

A column's text accessor supplies filtering text and the default cell content. Its optional cell function renders custom content. A compare function enables sorting.

Sorting cycles ascending, descending, then unsorted. Filtering and sorting reset pagination. Rows can be an array or an accessor such as a signal.

All processing is client-side. There is no server pagination, virtualization, spreadsheet editing, or row-selection model. The table retains native table semantics.