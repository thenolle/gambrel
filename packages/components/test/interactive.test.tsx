/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { hydrate, mount, type HydrationMismatch } from '@gambrel/browser'
import { signal } from '@gambrel/reactivity'
import { renderToString } from '@gambrel/view'
import { Window } from 'happy-dom'
import {
  Accordion,
  AspectRatio,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  Checkbox,
  Collapsible,
  RadioGroup,
  Select,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  Toggle
} from '../src/index.ts'
import { createDom } from './dom.ts'

const tabItems = [
  { value: 'a', label: 'One', content: 'Panel one' },
  { value: 'b', label: 'Two', content: 'Panel two', disabled: true },
  { value: 'c', label: 'Three', content: 'Panel three' }
]

const accordionItems = [
  { value: 'a', title: 'First', content: 'Alpha' },
  { value: 'b', title: 'Second', content: 'Beta' }
]

describe('static markup', () => {
  test('Avatar, AspectRatio and Breadcrumb', async () => {
    const avatar = await renderToString(
      <Avatar>
        <AvatarImage src="/a.png" />
        <AvatarFallback>AB</AvatarFallback>
      </Avatar>
    )
    expect(avatar).toContain('<img alt="" src="/a.png" class="gb-avatar-image">')
    expect(avatar).toContain('<span class="gb-avatar-fallback">AB</span>')
    expect(avatar).not.toContain('onerror')
    expect(await renderToString(<AspectRatio ratio={2}>x</AspectRatio>)).toBe(
      '<div class="gb-aspect" style="aspect-ratio: 2">x</div>'
    )
    const crumbs = await renderToString(
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Home</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Now</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
    )
    expect(crumbs).toContain('<nav aria-label="breadcrumb" class="gb-breadcrumb">')
    expect(crumbs).toContain('aria-current="page"')
    expect(crumbs).toContain('<li role="presentation" aria-hidden="true" class="gb-breadcrumb-separator"><svg')
  })

  test('Table is wrapped for horizontal scrolling', async () => {
    const html = await renderToString(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Ada</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    )
    expect(html.startsWith('<div class="gb-table-wrap"><table class="gb-table">')).toBe(true)
    expect(html).toContain('<th class="gb-table-head">Name</th>')
    expect(html).toContain('<td class="gb-table-cell">Ada</td>')
  })

  test('Checkbox, Switch and Toggle reflect their initial state', async () => {
    expect(await renderToString(<Checkbox />)).toBe('<input type="checkbox" class="gb-checkbox">')
    expect(await renderToString(<Checkbox defaultChecked />)).toBe('<input type="checkbox" class="gb-checkbox" checked>')
    const on = await renderToString(<Switch defaultChecked />)
    expect(on).toContain('role="switch"')
    expect(on).toContain('aria-checked="true"')
    expect(on).toContain('data-state="checked"')
    expect(await renderToString(<Switch />)).toContain('aria-checked="false"')
    expect(await renderToString(<Toggle>B</Toggle>)).toContain('aria-pressed="false"')
    expect(await renderToString(<Toggle defaultPressed variant="outline">B</Toggle>)).toContain('aria-pressed="true"')
  })

  test('RadioGroup and Select render the selected choice', async () => {
    const radios = await renderToString(
      <RadioGroup name="plan" defaultValue="pro" options={[{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }]} />
    )
    expect(radios).toContain('role="radiogroup"')
    expect(radios).toContain('name="plan" value="pro" checked')
    expect(radios).not.toContain('value="free" checked')
    const select = await renderToString(
      <Select placeholder="Pick one" options={[{ value: 'x', label: 'X' }]} defaultValue="" />
    )
    expect(select).toContain('<option value="" disabled selected>Pick one</option>')
    expect(select).toContain('<option value="x">X</option>')
    expect(await renderToString(<Select options={[{ value: 'x', label: 'X' }]} defaultValue="x" />)).toContain('value="x" selected')
  })

  test('Tabs link tabs to panels and hide inactive panels', async () => {
    const html = await renderToString(<Tabs id="t" items={tabItems} />)
    expect(html).toContain('role="tablist"')
    expect(html).toMatch(/id="t-tab-a"[^>]*aria-selected="true"/)
    expect(html).toMatch(/id="t-tab-c"[^>]*aria-selected="false"[^>]*tabindex="-1"/)
    expect(html).toContain('aria-controls="t-panel-a"')
    expect(html).not.toMatch(/id="t-panel-a"[^>]*hidden/)
    expect(html).toMatch(/id="t-panel-c"[^>]*hidden/)
    expect(html).toMatch(/id="t-tab-b"[^>]*disabled/)
  })

  test('Accordion and Collapsible render open and closed states', async () => {
    const html = await renderToString(<Accordion id="x" items={accordionItems} defaultValue={['a']} />)
    expect(html).toMatch(/id="x-trigger-a"[^>]*aria-expanded="true"/)
    expect(html).toMatch(/id="x-trigger-b"[^>]*aria-expanded="false"/)
    expect(html).toMatch(/id="x-content-b"[^>]*hidden/)
    expect(await renderToString(<Collapsible trigger="More">Body</Collapsible>)).toMatch(/id="collapsible-content" hidden/)
    expect(await renderToString(<Collapsible trigger="More" defaultOpen>Body</Collapsible>)).not.toMatch(/id="collapsible-content" hidden/)
  })
})

describe('interaction', () => {
  test('Checkbox reports changes and can be controlled by a signal', () => {
    const dom = createDom()
    const on = signal(false)
    const seen: boolean[] = []
    mount(dom.container, <Checkbox checked={on} onCheckedChange={(value) => void seen.push(value)} />)
    const input = dom.query<HTMLInputElement>('input')
    input.checked = true
    dom.change(input)
    expect(seen).toEqual([true])
    expect(on()).toBe(false)
    on.set(true)
    expect(input.checked).toBe(true)
  })

  test('Switch toggles by itself and defers to a controlling signal', () => {
    const dom = createDom()
    mount(dom.container, <Switch />)
    const button = dom.query('button')
    dom.click(button)
    expect(button.getAttribute('aria-checked')).toBe('true')
    dom.click(button)
    expect(button.getAttribute('aria-checked')).toBe('false')

    const controlled = createDom()
    const on = signal(false)
    const seen: boolean[] = []
    mount(controlled.container, <Switch checked={on} onCheckedChange={(value) => void seen.push(value)} />)
    const other = controlled.query('button')
    controlled.click(other)
    expect(seen).toEqual([true])
    expect(other.getAttribute('aria-checked')).toBe('false')
    on.set(true)
    expect(other.getAttribute('aria-checked')).toBe('true')
  })

  test('Toggle flips aria-pressed', () => {
    const dom = createDom()
    mount(dom.container, <Toggle>Bold</Toggle>)
    const button = dom.query('button')
    dom.click(button)
    expect(button.getAttribute('aria-pressed')).toBe('true')
    expect(button.getAttribute('data-state')).toBe('on')
  })

  test('RadioGroup selects one option and reports it', () => {
    const dom = createDom()
    const seen: string[] = []
    mount(
      dom.container,
      <RadioGroup
        name="plan"
        defaultValue="free"
        onValueChange={(value) => void seen.push(value)}
        options={[{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }]}
      />
    )
    const [free, pro] = dom.queryAll<HTMLInputElement>('input')
    if (free === undefined || pro === undefined) throw new Error('Radios missing')
    expect(free.checked).toBe(true)
    pro.checked = true
    dom.change(pro)
    expect(seen).toEqual(['pro'])
    expect(free.checked).toBe(false)
    expect(pro.checked).toBe(true)
  })

  test('Tabs switch on click and by keyboard, skipping disabled tabs', () => {
    const dom = createDom()
    mount(dom.container, <Tabs id="t" items={tabItems} />)
    const [a, b, c] = dom.queryAll<HTMLElement>('[role="tab"]')
    if (a === undefined || b === undefined || c === undefined) throw new Error('Tabs missing')
    expect(dom.query<HTMLElement>('#t-panel-a').hidden).toBe(false)
    dom.click(c)
    expect(c.getAttribute('aria-selected')).toBe('true')
    expect(dom.query<HTMLElement>('#t-panel-a').hidden).toBe(true)
    expect(dom.query<HTMLElement>('#t-panel-c').hidden).toBe(false)
    dom.key(c, 'ArrowLeft')
    expect(a.getAttribute('aria-selected')).toBe('true')
    dom.key(a, 'ArrowRight')
    expect(c.getAttribute('aria-selected')).toBe('true')
    expect(b.getAttribute('aria-selected')).toBe('false')
    dom.key(c, 'Home')
    expect(a.getAttribute('aria-selected')).toBe('true')
  })

  test('Accordion single mode keeps one open and obeys collapsible', () => {
    const dom = createDom()
    mount(dom.container, <Accordion id="x" items={accordionItems} />)
    const [first, second] = dom.queryAll<HTMLElement>('button')
    if (first === undefined || second === undefined) throw new Error('Triggers missing')
    dom.click(first)
    expect(first.getAttribute('aria-expanded')).toBe('true')
    dom.click(second)
    expect(first.getAttribute('aria-expanded')).toBe('false')
    expect(second.getAttribute('aria-expanded')).toBe('true')
    dom.click(second)
    expect(second.getAttribute('aria-expanded')).toBe('true')

    const loose = createDom()
    mount(loose.container, <Accordion id="y" items={accordionItems} collapsible />)
    const trigger = loose.query('button')
    loose.click(trigger)
    loose.click(trigger)
    expect(trigger.getAttribute('aria-expanded')).toBe('false')
  })

  test('Accordion multiple mode keeps several open', () => {
    const dom = createDom()
    const seen: string[][] = []
    mount(dom.container, <Accordion id="m" type="multiple" items={accordionItems} onValueChange={(value) => void seen.push([...value])} />)
    const [first, second] = dom.queryAll<HTMLElement>('button')
    if (first === undefined || second === undefined) throw new Error('Triggers missing')
    dom.click(first)
    dom.click(second)
    expect(first.getAttribute('aria-expanded')).toBe('true')
    expect(second.getAttribute('aria-expanded')).toBe('true')
    expect(seen).toEqual([['a'], ['a', 'b']])
  })

  test('Collapsible opens and closes its panel', () => {
    const dom = createDom()
    mount(dom.container, <Collapsible trigger="More">Body</Collapsible>)
    const button = dom.query('button')
    const panel = dom.query<HTMLElement>('#collapsible-content')
    expect(panel.hidden).toBe(true)
    dom.click(button)
    expect(button.getAttribute('aria-expanded')).toBe('true')
    expect(panel.hidden).toBe(false)
  })

  test('Select reports the chosen value', () => {
    const dom = createDom()
    const seen: string[] = []
    mount(dom.container, <Select defaultValue="a" onValueChange={(value) => void seen.push(value)} options={[{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]} />)
    const select = dom.query<HTMLSelectElement>('select')
    select.value = 'b'
    dom.change(select)
    expect(seen).toEqual(['b'])
  })
})

describe('hydration', () => {
  test('stateful components hydrate without mismatches', async () => {
    const tree = (
      <div>
        <Tabs id="t" items={tabItems} defaultValue="c" />
        <Accordion id="x" items={accordionItems} defaultValue={['b']} />
        <Switch defaultChecked />
        <Checkbox defaultChecked name="agree" />
        <Toggle defaultPressed>B</Toggle>
        <RadioGroup name="plan" defaultValue="pro" options={[{ value: 'free', label: 'Free' }, { value: 'pro', label: 'Pro' }]} />
        <Select defaultValue="x" options={[{ value: 'x', label: 'X' }, { value: 'y', label: 'Y' }]} />
        <Collapsible trigger="More" defaultOpen>
          Body
        </Collapsible>
      </div>
    )
    const window = new Window()
    const document = window.document as unknown as Document
    document.body.innerHTML = `<div id="app">${await renderToString(tree)}</div>`
    const container = document.getElementById('app')
    if (container === null) throw new Error('Container missing')
    const found: HydrationMismatch[] = []
    hydrate(container, tree, { onMismatch: (mismatch) => void found.push(mismatch) })
    expect(found).toEqual([])
  })
})