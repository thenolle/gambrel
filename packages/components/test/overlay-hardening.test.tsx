/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { mount } from '@gambrel/browser'
import { signal } from '@gambrel/reactivity'
import {
  Button,
  Dialog,
  Popover,
  Tooltip
} from '../src/index.ts'
import { createDom } from './dom.ts'

describe('nested dismissal', () => {
  test('one Escape closes only the topmost popover', () => {
    const dom = createDom()

    const mounted = mount(
      dom.container,
      <Popover
        id="outer-panel"
        trigger={(props) => <Button {...props}>Outer</Button>}
      >
        <Popover
          id="inner-panel"
          trigger={(props) => <Button {...props}>Inner</Button>}
        >
          Inner content
        </Popover>
      </Popover>
    )

    const outerTrigger = dom.query<HTMLElement>('[aria-controls="outer-panel"]')
    const innerTrigger = dom.query<HTMLElement>('[aria-controls="inner-panel"]')
    const outer = dom.query<HTMLElement>('#outer-panel')
    const inner = dom.query<HTMLElement>('#inner-panel')

    dom.click(outerTrigger)
    dom.click(innerTrigger)

    expect(outer.hidden).toBe(false)
    expect(inner.hidden).toBe(false)

    dom.key(innerTrigger, 'Escape')

    expect(inner.hidden).toBe(true)
    expect(outer.hidden).toBe(false)
    expect(dom.document.activeElement).toBe(innerTrigger)

    dom.key(innerTrigger, 'Escape')

    expect(outer.hidden).toBe(true)
    expect(dom.document.activeElement).toBe(outerTrigger)

    mounted.dispose()
  })

  test('outside dismissal does not notify a disposed layer', () => {
    const dom = createDom()
    const changes: boolean[] = []

    const mounted = mount(
      dom.container,
      <Popover
        id="disposable"
        trigger={(props) => <Button {...props}>Open</Button>}
        onOpenChange={(value) => void changes.push(value)}
      >
        Content
      </Popover>
    )

    dom.click(dom.query('button'))
    expect(changes).toEqual([true])

    mounted.dispose()
    dom.fire(dom.document.body, 'pointerdown')

    expect(changes).toEqual([true])
  })
})

describe('modal lifecycle', () => {
  test('a controlled dialog can decline Escape dismissal', () => {
    const dom = createDom()
    const requested: boolean[] = []
    const open = signal(true)

    const mounted = mount(
      dom.container,
      <Dialog
        id="controlled-modal"
        open={open}
        title="Controlled"
        onOpenChange={(value) => void requested.push(value)}
      />
    )

    const dialog = dom.query<HTMLDialogElement>('dialog')
    expect(dialog.open).toBe(true)

    dom.key(dialog, 'Escape')

    expect(requested).toEqual([false])
    expect(open()).toBe(true)
    expect(dialog.open).toBe(true)

    open.set(false)
    expect(dialog.open).toBe(false)

    mounted.dispose()
  })

  test('native cancel is prevented before requesting controlled close', () => {
    const dom = createDom()
    const requested: boolean[] = []

    const mounted = mount(
      dom.container,
      <Dialog
        id="cancel-modal"
        open={true}
        title="Cancel"
        onOpenChange={(value) => void requested.push(value)}
      />
    )

    const dialog = dom.query<HTMLDialogElement>('dialog')
    const view = dom.document.defaultView
    if (view === null) throw new Error('Document has no window')

    const event = new view.Event('cancel', { cancelable: true })
    dialog.dispatchEvent(event)

    expect(event.defaultPrevented).toBe(true)
    expect(requested).toEqual([false])
    expect(dialog.open).toBe(true)

    mounted.dispose()
  })

  test('closing restores focus and disposal closes an open modal', () => {
    const dom = createDom()

    const mounted = mount(
      dom.container,
      <Dialog
        id="focus-modal"
        trigger={(props) => <Button {...props}>Open</Button>}
        title="Focus"
      >
        <input aria-label="Name" />
      </Dialog>
    )

    const trigger = dom.query<HTMLButtonElement>('[aria-controls="focus-modal"]')
    trigger.focus()
    dom.click(trigger)

    const dialog = dom.query<HTMLDialogElement>('dialog')
    expect(dialog.open).toBe(true)

    dom.click(dom.query('.gb-dialog-close'))
    expect(dialog.open).toBe(false)
    expect(dom.document.activeElement).toBe(trigger)

    dom.click(trigger)
    expect(dialog.open).toBe(true)

    mounted.dispose()
    expect(dialog.open).toBe(false)
  })

  test('an unexpected native close is reconciled with controlled state', async () => {
    const dom = createDom()
    const requested: boolean[] = []

    const mounted = mount(
      dom.container,
      <Dialog
        id="native-close-modal"
        title="Native close"
        open={true}
        onOpenChange={(value) => void requested.push(value)}
      />
    )

    const dialog = dom.query<HTMLDialogElement>('dialog')
    dialog.close()
    await Promise.resolve()

    expect(requested).toEqual([false])
    expect(dialog.open).toBe(true)

    mounted.dispose()
  })
})

describe('tooltip ownership', () => {
  test('disposal cancels delayed display', async () => {
    const dom = createDom()

    const mounted = mount(
      dom.container,
      <Tooltip id="delayed-hint" content="Hint" delay={10}>
        <Button>Action</Button>
      </Tooltip>
    )

    const wrapper = dom.query('.gb-tooltip')
    const hint = dom.query<HTMLElement>('[role="tooltip"]')

    dom.fire(wrapper, 'mouseenter')
    mounted.dispose()

    await new Promise((resolve) => setTimeout(resolve, 25))

    expect(hint.hidden).toBe(true)
  })

  test('focus keeps a tooltip visible after the pointer leaves', () => {
    const dom = createDom()

    const mounted = mount(
      dom.container,
      <Tooltip id="shared-hint" content="Hint">
        <Button>Action</Button>
      </Tooltip>
    )

    const wrapper = dom.query('.gb-tooltip')
    const button = dom.query<HTMLButtonElement>('button')
    const hint = dom.query<HTMLElement>('[role="tooltip"]')

    dom.fire(wrapper, 'mouseenter')
    button.focus()
    dom.fire(wrapper, 'mouseleave')

    expect(hint.hidden).toBe(false)
    expect(button.getAttribute('aria-describedby')).toBe('shared-hint')

    mounted.dispose()
    expect(button.getAttribute('aria-describedby')).toBeNull()
  })

  test('existing description ids are preserved and restored', () => {
    const dom = createDom()

    const mounted = mount(
      dom.container,
      <Tooltip id="extra-hint" content="Hint">
        <Button aria-describedby="existing">Action</Button>
      </Tooltip>
    )

    const button = dom.query<HTMLButtonElement>('button')
    button.focus()

    expect(button.getAttribute('aria-describedby')).toBe('existing extra-hint')

    mounted.dispose()

    expect(button.getAttribute('aria-describedby')).toBe('existing')
  })
})