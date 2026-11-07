/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { hydrate, mount, type HydrationMismatch } from '@gambrel/browser'
import { signal } from '@gambrel/reactivity'
import { renderToString } from '@gambrel/view'
import {
  Combobox,
  Command,
  DataTable,
  DescriptionList,
  EmptyState,
  NavigationLink,
  NavigationList,
  NavigationMenu,
  Sidebar,
  SidebarContent,
  StatCard,
  Stepper,
  Toolbar,
  type DataColumn
} from '../src/index.ts'
import { createDom } from './dom.ts'

const options = [
  { value: 'fr', label: 'France' },
  { value: 'de', label: 'Germany', disabled: true },
  { value: 'gb', label: 'United Kingdom' }
]

interface Person {
  name: string
  age: number
}

const people: readonly Person[] = [
  { name: 'Grace', age: 40 },
  { name: 'Ada', age: 30 },
  { name: 'Margaret', age: 50 }
]

const columns: readonly DataColumn<Person>[] = [
  {
    id: 'name',
    header: 'Name',
    text: (row) => row.name,
    compare: (a, b) => a.name.localeCompare(b.name)
  },
  {
    id: 'age',
    header: 'Age',
    text: (row) => String(row.age),
    compare: (a, b) => a.age - b.age
  }
]

describe('Command', () => {
  test('filters and invokes actions from the keyboard', () => {
    const dom = createDom()
    const selected: string[] = []
    mount(
      dom.container,
      <Command
        id="actions"
        items={[
          { value: 'save', label: 'Save' },
          { value: 'delete', label: 'Delete', disabled: true },
          { value: 'open', label: 'Open', keywords: ['load'] }
        ]}
        onValueSelect={(value) => void selected.push(value)}
      />
    )
    const input = dom.query<HTMLInputElement>('input')
    dom.key(input, 'ArrowDown')
    dom.key(input, 'Enter')
    expect(selected).toEqual(['open'])

    input.value = 'load'
    dom.fire(input, 'input')
    expect(dom.queryAll('[role="option"]').length).toBe(1)
    dom.key(input, 'Enter')
    expect(selected).toEqual(['open', 'open'])

    input.value = 'nothing'
    dom.fire(input, 'input')
    expect(dom.container.textContent).toContain('No matching commands.')
  })
})

describe('Combobox', () => {
  test('filters, selects and updates its submitted value', () => {
    const dom = createDom()
    mount(
      dom.container,
      <Combobox id="country" label="Country" name="country" options={options} />
    )
    const input = dom.query<HTMLInputElement>('[role="combobox"]')
    dom.fire(input, 'focus')
    input.value = 'France'
    dom.fire(input, 'input')
    dom.key(input, 'Enter')

    expect(input.value).toBe('France')
    expect(input.getAttribute('aria-expanded')).toBe('false')
    expect(dom.query<HTMLInputElement>('input[type="hidden"]').value).toBe('fr')
  })

  test('controlled selection can be declined', () => {
    const dom = createDom()
    mount(
      dom.container,
      <Combobox id="fixed" label="Country" value="fr" options={options} />
    )
    const input = dom.query<HTMLInputElement>('[role="combobox"]')
    dom.fire(input, 'focus')
    input.value = 'United'
    dom.fire(input, 'input')
    dom.key(input, 'Enter')
    expect(input.value).toBe('France')
  })

  test('reset restores an uncontrolled default', async () => {
    const dom = createDom()
    mount(
      dom.container,
      <form>
        <Combobox
          id="reset-country"
          label="Country"
          defaultValue="fr"
          options={options}
        />
      </form>
    )
    const input = dom.query<HTMLInputElement>('[role="combobox"]')
    dom.fire(input, 'focus')
    input.value = 'United'
    dom.fire(input, 'input')
    dom.key(input, 'Enter')
    dom.query<HTMLFormElement>('form').reset()
    await Promise.resolve()
    expect(input.value).toBe('France')
  })
})

describe('DataTable', () => {
  test('paginates, sorts and filters', () => {
    const dom = createDom()
    mount(
      dom.container,
      <DataTable rows={people} columns={columns} pageSize={2} caption="People" />
    )
    expect(dom.query('tbody').textContent).toContain('Grace')
    expect(dom.query('tbody').textContent).not.toContain('Margaret')

    const next = dom.queryAll<HTMLButtonElement>('button').find((button) => button.textContent === 'Next')
    if (next === undefined) throw new Error('Next button missing')
    dom.click(next)
    expect(dom.query('tbody').textContent).toContain('Margaret')

    dom.click(dom.query('.gb-data-table-sort'))
    expect(dom.query('tbody tr td').textContent).toBe('Ada')
    expect(dom.query('th').getAttribute('aria-sort')).toBe('ascending')

    const input = dom.query<HTMLInputElement>('input')
    input.value = 'Margaret'
    dom.fire(input, 'input')
    expect(dom.queryAll('tbody tr').length).toBe(1)
    expect(dom.query('tbody').textContent).toContain('Margaret')
  })

  test('responds to external rows and rejects invalid page sizes', () => {
    const dom = createDom()
    const rows = signal<readonly Person[]>(people)
    mount(dom.container, <DataTable rows={rows} columns={columns} caption="People" />)
    rows.set([])
    expect(dom.container.textContent).toContain('No matching rows.')

    expect(() => DataTable({
      rows: people,
      columns,
      caption: 'People',
      pageSize: 0
    })).toThrow('positive integer')
  })
})

describe('application primitives', () => {
  test('renders native navigation and descriptive content', async () => {
    const html = await renderToString(
      <div>
        <NavigationMenu>
          <NavigationList>
            <li>
              <NavigationLink href="/" aria-current="page">Home</NavigationLink>
            </li>
          </NavigationList>
        </NavigationMenu>
        <Sidebar><SidebarContent>Links</SidebarContent></Sidebar>
        <Toolbar aria-label="Actions">Actions</Toolbar>
        <EmptyState title="No projects" description="Create your first project." />
        <StatCard label="Projects" value={12} detail="This month" />
        <DescriptionList items={[{ term: 'Owner', description: 'Nolly' }]} />
      </div>
    )
    expect(html).toContain('aria-current="page"')
    expect(html).toContain('No projects')
    expect(html).toContain('<dt>Owner</dt><dd>Nolly</dd>')
    expect(html).toContain('gb-stat-value')
  })

  test('Stepper follows its signal', () => {
    const dom = createDom()
    const current = signal('one')
    mount(
      dom.container,
      <Stepper
        current={current}
        items={[{ value: 'one', label: 'One' }, { value: 'two', label: 'Two' }]}
      />
    )
    current.set('two')
    expect(dom.query('[aria-current="step"]').textContent).toContain('Two')
    expect(dom.query('[data-state="complete"]').textContent).toContain('One')
  })
})

test('application UI hydrates without mismatches', async () => {
  const tree = (
    <div>
      <Command id="hydrate-actions" items={[{ value: 'save', label: 'Save' }]} />
      <Combobox id="hydrate-country" label="Country" options={options} defaultValue="fr" />
      <DataTable rows={people} columns={columns} caption="People" pageSize={2} />
      <Stepper current="one" items={[{ value: 'one', label: 'One' }]} />
    </div>
  )
  const dom = createDom(await renderToString(tree))
  const input = dom.query('input')
  const mismatches: HydrationMismatch[] = []
  const root = hydrate(dom.container, tree, {
    onMismatch: (mismatch) => void mismatches.push(mismatch)
  })
  expect(mismatches).toEqual([])
  expect(dom.query('input')).toBe(input)
  root.dispose()
})