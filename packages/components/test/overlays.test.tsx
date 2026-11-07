/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { hydrate, mount, type HydrationMismatch } from '@gambrel/browser'
import { signal } from '@gambrel/reactivity'
import { renderToString } from '@gambrel/view'
import {
  AlertDialog,
  Blockquote,
  Button,
  createToasts,
  Dialog,
  DropdownMenu,
  H1,
  Pagination,
  paginationRange,
  Popover,
  ScrollArea,
  Sheet,
  Slider,
  toast,
  Tooltip
} from '../src/index.ts'
import { createDom } from './dom.ts'

describe('static markup', () => {
  test('Dialog renders a closed dialog with linked title and description', async () => {
    const html = await renderToString(
      <Dialog
        id="d"
        trigger={<Button>Open</Button>}
        title="Edit"
        description="Make changes"
        footer="foot"
      >
        Body
      </Dialog>
    )

    const dom = createDom(html)
    const trigger = dom.query('span.gb-trigger')
    const button = trigger.querySelector('button')
    const dialog = dom.query<HTMLDialogElement>('dialog')

    expect(button?.textContent).toBe('Open')
    expect(dialog.open).toBe(false)
    expect(dialog.id).toBe('d')
    expect(dialog.getAttribute('aria-labelledby')).toBe('d-title')
    expect(dialog.getAttribute('aria-describedby')).toBe('d-description')
    expect(dom.query('#d-title').textContent).toBe('Edit')
    expect(dom.query('#d-description').textContent).toBe('Make changes')
    expect(dom.query('.gb-dialog-footer').textContent).toBe('foot')
    expect(dom.query('[aria-label="Close"]')).not.toBeNull()
    expect(dialog.classList.contains('gb-dialog')).toBe(true)
    expect(dialog.classList.contains('gb-dialog-center')).toBe(true)
  })

  test('AlertDialog has the alertdialog role, no close button and decision buttons', async () => {
    const html = await renderToString(<AlertDialog trigger={<Button>Delete</Button>} title="Sure?" destructive actionLabel="Delete" />)
    expect(html).toContain('role="alertdialog"')
    expect(html).not.toContain('aria-label="Close"')
    expect(html).toContain('Cancel')
    expect(html).toContain('gb-button-destructive')
  })

  test('Sheet docks to a side', async () => {
    expect(await renderToString(<Sheet side="left" title="Menu" />)).toContain('class="gb-dialog gb-sheet gb-sheet-left"')
  })

  test('Popover, Tooltip and DropdownMenu render closed', async () => {
    const popover = await renderToString(<Popover id="p" trigger={<Button>Open</Button>}>Hi</Popover>)
    expect(popover).toMatch(/id="p" role="dialog" hidden class="gb-popover-content gb-popover-bottom gb-popover-align-center"/)
    const tooltip = await renderToString(<Tooltip content="Hint"><Button>?</Button></Tooltip>)
    expect(tooltip).toContain('aria-describedby="tooltip"')
    expect(tooltip).toMatch(/id="tooltip" role="tooltip" hidden/)
    const menu = await renderToString(
      <DropdownMenu
        trigger={<Button>Menu</Button>}
        items={[{ type: 'label', label: 'Account' }, { label: 'Profile', shortcut: 'P' }, { type: 'separator' }, { label: 'Delete', destructive: true, disabled: true }]}
      />
    )
    expect(menu).toContain('role="menu"')
    expect(menu).toContain('<div class="gb-menu-label">Account</div>')
    expect(menu).toContain('<span class="gb-menu-shortcut">P</span>')
    expect(menu).toContain('role="separator"')
    expect(menu).toMatch(/role="menuitem" tabindex="-1" disabled class="gb-menu-item gb-menu-item-destructive"/)
  })

  test('Pagination renders links, the current page and disabled ends', async () => {
    const html = await renderToString(<Pagination page={1} pageCount={3} href={(page) => `/p/${page}`} />)
    expect(html).toContain('aria-label="pagination"')
    expect(html).toMatch(/<span aria-disabled="true"[^>]*>.*Previous/)
    expect(html).toContain('href="/p/2"')
    expect(html).toMatch(/href="\/p\/1" aria-current="page"/)
    expect(html).toContain('aria-label="Go to next page"')
  })

  test('paginationRange keeps the ends and collapses the middle', () => {
    expect(paginationRange(1, 5)).toEqual([1, 2, 3, 4, 5])
    expect(paginationRange(1, 10)).toEqual([1, 2, 3, 4, 5, 'ellipsis', 10])
    expect(paginationRange(5, 10)).toEqual([1, 'ellipsis', 4, 5, 6, 'ellipsis', 10])
    expect(paginationRange(10, 10)).toEqual([1, 'ellipsis', 6, 7, 8, 9, 10])
  })

  test('Slider, typography and ScrollArea', async () => {
    const slider = await renderToString(<Slider defaultValue={40} />)
    expect(slider).toContain('type="range" min="0" max="100" step="1"')
    expect(slider).toContain('value="40"')
    expect(slider).toContain('--gb-fill: 40%')
    expect(await renderToString(<H1>Title</H1>)).toBe('<h1 class="gb-h1">Title</h1>')
    expect(await renderToString(<Blockquote>q</Blockquote>)).toBe('<blockquote class="gb-blockquote">q</blockquote>')
    expect(await renderToString(<ScrollArea class="h-40">x</ScrollArea>)).toBe('<div class="gb-scroll-area h-40">x</div>')
  })
})

describe('interaction', () => {
  test('Dialog opens from its trigger and closes with the close button', () => {
    const dom = createDom()
    const seen: boolean[] = []
    mount(dom.container, <Dialog trigger={<Button>Open</Button>} title="Edit" onOpenChange={(open) => void seen.push(open)} />)
    const dialog = dom.query<HTMLDialogElement>('dialog')
    expect(dialog.open).toBe(false)
    dom.click(dom.query('button'))
    expect(dialog.open).toBe(true)
    dom.click(dom.query('.gb-dialog-close'))
    expect(dialog.open).toBe(false)
    expect(seen).toEqual([true, false])
  })

  test('Dialog with defaultOpen opens after mounting', () => {
    const dom = createDom()
    mount(dom.container, <Dialog defaultOpen title="Hello" />)
    expect(dom.query<HTMLDialogElement>('dialog').open).toBe(true)
  })

  test('AlertDialog runs its action and closes', () => {
    const dom = createDom()
    let ran = 0
    mount(dom.container, <AlertDialog defaultOpen title="Sure?" actionLabel="Yes" onAction={() => void (ran += 1)} />)
    const dialog = dom.query<HTMLDialogElement>('dialog')
    expect(dialog.open).toBe(true)
    const yes = dom.queryAll<HTMLElement>('.gb-dialog-footer button').find((button) => button.textContent === 'Yes')
    if (yes === undefined) throw new Error('Action button missing')
    dom.click(yes)
    expect(ran).toBe(1)
    expect(dialog.open).toBe(false)
  })

  test('Popover toggles, and closes on Escape and on a press outside', () => {
    const dom = createDom()
    mount(dom.container, <Popover id="p" trigger={(props) => <Button {...props}>Open</Button>}>Hello</Popover>)
    const content = dom.query<HTMLElement>('#p')
    const trigger = dom.query('button')
    expect(content.hidden).toBe(true)
    dom.click(trigger)
    expect(content.hidden).toBe(false)
    expect(trigger.getAttribute('aria-expanded')).toBe('true')
    dom.fire(dom.document.body, 'pointerdown')
    expect(content.hidden).toBe(true)
    dom.click(trigger)
    dom.key(content, 'Escape')
    expect(content.hidden).toBe(true)
  })

  test('Tooltip shows on hover and focus and hides on leave and Escape', () => {
    const dom = createDom()
    mount(dom.container, <Tooltip content="Hint"><Button>?</Button></Tooltip>)
    const wrapper = dom.query('.gb-tooltip')
    const tip = dom.query<HTMLElement>('[role="tooltip"]')
    expect(tip.hidden).toBe(true)
    dom.fire(wrapper, 'mouseenter')
    expect(tip.hidden).toBe(false)
    dom.fire(wrapper, 'mouseleave')
    expect(tip.hidden).toBe(true)
    dom.fire(wrapper, 'focusin')
    expect(tip.hidden).toBe(false)
    dom.key(wrapper, 'Escape')
    expect(tip.hidden).toBe(true)
  })

  test('DropdownMenu focuses its first item, navigates with the keyboard and selects', () => {
    const dom = createDom()
    const picked: string[] = []
    mount(
      dom.container,
      <DropdownMenu
        trigger={(props) => <Button {...props}>Menu</Button>}
        items={[
          { label: 'One', onSelect: () => void picked.push('one') },
          { label: 'Two', disabled: true },
          { label: 'Three', onSelect: () => void picked.push('three') }
        ]}
      />
    )
    const trigger = dom.query<HTMLElement>('[aria-haspopup]')
    const menu = dom.query<HTMLElement>('[role="menu"]')
    dom.click(trigger)
    const [first, , third] = dom.queryAll<HTMLElement>('[role="menuitem"]')
    if (first === undefined || third === undefined) throw new Error('Menu items missing')
    expect(menu.hidden).toBe(false)
    expect(dom.document.activeElement).toBe(first)
    dom.key(menu, 'ArrowDown')
    expect(dom.document.activeElement).toBe(third)
    dom.key(menu, 'ArrowDown')
    expect(dom.document.activeElement).toBe(first)
    dom.click(third)
    expect(picked).toEqual(['three'])
    expect(menu.hidden).toBe(true)
    dom.click(trigger)
    dom.key(menu, 'Escape')
    expect(menu.hidden).toBe(true)
    expect(dom.document.activeElement).toBe(trigger)
  })

  test('Slider reports the value and moves its fill', () => {
    const dom = createDom()
    const seen: number[] = []
    mount(dom.container, <Slider defaultValue={10} onValueChange={(value) => void seen.push(value)} />)
    const input = dom.query<HTMLInputElement>('input')
    input.value = '70'
    dom.fire(input, 'input')
    expect(seen).toEqual([70])
    expect(input.getAttribute('style')).toContain('--gb-fill: 70%')
  })

  test('a controlled Slider follows its signal', () => {
    const dom = createDom()
    const level = signal(20)
    mount(dom.container, <Slider value={level} />)
    level.set(55)
    expect(dom.query('input').getAttribute('style')).toContain('--gb-fill: 55%')
  })
})

describe('toasts', () => {
  test('a toast appears, can be dismissed, and expires', async () => {
    const dom = createDom()
    const { toast: show, dismiss, Toaster } = createToasts()
    mount(dom.container, <Toaster />)
    expect(dom.queryAll('[role="status"]').length).toBe(0)
    const id = show({ title: 'Saved', description: 'All good', duration: 0 })
    expect(dom.container.textContent).toContain('Saved')
    expect(dom.container.textContent).toContain('All good')
    dismiss(id)
    expect(dom.queryAll('[role="status"]').length).toBe(0)
    show({ title: 'Short', duration: 5 })
    expect(dom.queryAll('[role="status"]').length).toBe(1)
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(dom.queryAll('[role="status"]').length).toBe(0)
  })

  test('the close button dismisses and destructive toasts get their style', () => {
    const dom = createDom()
    const { toast: show, Toaster } = createToasts()
    mount(dom.container, <Toaster position="top-left" />)
    show({ title: 'Failed', variant: 'destructive', duration: 0 })
    expect(dom.query('[role="status"]').className).toContain('gb-toast-destructive')
    expect(dom.query('.gb-toaster').className).toContain('gb-toaster-top-left')
    dom.click(dom.query('.gb-toast-close'))
    expect(dom.queryAll('[role="status"]').length).toBe(0)
  })

  test('the shared toast() refuses to run on a server', () => {
    expect(() => toast({ title: 'x' })).toThrow('browser')
  })
})

describe('hydration', () => {
  test('overlay components hydrate without mismatches', async () => {
    const { Toaster } = createToasts()
    const tree = (
      <div>
        <Dialog id="d1" trigger={<Button>Open</Button>} title="Edit" description="Text" />
        <Popover id="p1" trigger={(props) => <Button {...props}>Pop</Button>}>Hi</Popover>
        <Tooltip id="t1" content="Hint"><Button>?</Button></Tooltip>
        <DropdownMenu id="m1" trigger={(props) => <Button {...props}>Menu</Button>} items={[{ label: 'A' }, { type: 'separator' }, { label: 'B' }]} />
        <Pagination page={2} pageCount={9} href={(page) => `/p/${page}`} />
        <Slider defaultValue={30} />
        <Toaster />
      </div>
    )
    const dom = createDom(await renderToString(tree))
    const found: HydrationMismatch[] = []
    hydrate(dom.container, tree, { onMismatch: (mismatch) => void found.push(mismatch) })
    expect(found).toEqual([])
  })
})