import { effect } from '@gambrel/reactivity'
import { createElement, type Child, type EventHandler } from '@gambrel/view'

export interface TriggerProps {
  readonly onClick: EventHandler
  readonly 'aria-haspopup': string
  readonly 'aria-expanded': () => string
  readonly 'aria-controls': string
}

export type Trigger = Child | ((props: TriggerProps) => Child)

interface Layer {
  readonly root: Element
  readonly escape: () => void
  readonly outside: (() => void) | undefined
}

interface LayerStack {
  readonly layers: Layer[]
  readonly keydown: (event: KeyboardEvent) => void
  readonly pointerdown: (event: PointerEvent) => void
}

const stacks = new WeakMap<Document, LayerStack>()

function stackFor(doc: Document): LayerStack {
  const existing = stacks.get(doc)
  if (existing !== undefined) return existing

  const layers: Layer[] = []

  const keydown = (event: KeyboardEvent): void => {
    if (event.key !== 'Escape' || event.defaultPrevented) return
    const top = layers[layers.length - 1]
    if (top === undefined) return
    event.preventDefault()
    event.stopPropagation()
    top.escape()
  }

  const pointerdown = (event: PointerEvent): void => {
    const top = layers[layers.length - 1]
    const target = event.target as Node | null
    if (top === undefined || target === null || top.root.contains(target)) return
    top.outside?.()
  }

  const stack: LayerStack = { layers, keydown, pointerdown }
  doc.addEventListener('keydown', keydown, true)
  doc.addEventListener('pointerdown', pointerdown, true)
  stacks.set(doc, stack)
  return stack
}

/**
 * Registers an open layer. Returns an idempotent unregister function.
 * Browser-only: callers invoke this during ref/effect setup.
 */
export function registerLayer(
  root: Element,
  handlers: {
    readonly escape: () => void
    readonly outside?: (() => void) | undefined
  }
): () => void {
  const doc = root.ownerDocument
  const stack = stackFor(doc)
  const layer: Layer = {
    root,
    escape: handlers.escape,
    outside: handlers.outside
  }
  stack.layers.push(layer)

  let removed = false

  return () => {
    if (removed) return
    removed = true
    const index = stack.layers.indexOf(layer)
    if (index >= 0) stack.layers.splice(index, 1)

    if (stack.layers.length === 0) {
      doc.removeEventListener('keydown', stack.keydown, true)
      doc.removeEventListener('pointerdown', stack.pointerdown, true)
      stacks.delete(doc)
    }
  }
}

export function renderTrigger(trigger: Trigger, props: TriggerProps): Child {
  if (typeof trigger === 'function') {
    return (trigger as (props: TriggerProps) => Child)(props)
  }

  return createElement('span', {
    class: 'gb-trigger',
    onClick: props.onClick,
    'aria-haspopup': props['aria-haspopup'],
    'aria-expanded': props['aria-expanded'],
    'aria-controls': props['aria-controls'],
    children: trigger
  })
}

function focusElement(element: Element | null): void {
  if (element === null || !element.isConnected || !('focus' in element)) return
  ;(element as HTMLElement).focus()
}

/**
 * Closes only the topmost registered layer on Escape or an outside pointer press.
 * Call from a ref callback.
 */
export function dismissOutside(
  root: Element,
  isOpen: () => boolean,
  close: () => void,
  onEscape?: () => void
): void {
  effect(() => {
    if (!isOpen()) return undefined

    const doc = root.ownerDocument
    const previous = doc.activeElement
    const trigger = root.querySelector('[aria-haspopup], button, a[href]')

    const unregister = registerLayer(root, {
      escape: () => {
        close()
        if (onEscape !== undefined) onEscape()
        else focusElement(trigger ?? previous)
      },
      outside: close
    })

    return () => {
      unregister()
      const active = doc.activeElement
      if (active !== null && root.contains(active)) {
        focusElement(trigger ?? previous)
      }
    }
  })
}