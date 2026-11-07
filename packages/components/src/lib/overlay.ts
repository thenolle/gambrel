import { effect } from '@gambrel/reactivity'
import { createElement, type Child, type EventHandler } from '@gambrel/view'

/**
 * Props to spread on your own trigger element. `aria-expanded` is reactive.
 */
export interface TriggerProps {
  readonly onClick: EventHandler
  readonly 'aria-haspopup': string
  readonly 'aria-expanded': () => string
  readonly 'aria-controls': string
}

/**
 * Either an element, which is wrapped in a clickable span, or a function that receives
 * `TriggerProps` and returns your own trigger.
 */
export type Trigger = Child | ((props: TriggerProps) => Child)

export function renderTrigger(trigger: Trigger, props: TriggerProps): Child {
  if (typeof trigger === 'function') return (trigger as (props: TriggerProps) => Child)(props)
  return createElement('span', { class: 'gb-trigger', onClick: props.onClick, children: trigger })
}

/**
 * While `isOpen()` is true, closes on a pointer press outside `root` and on Escape.
 * Call it from a `ref` callback so it only runs in the browser.
 */
export function dismissOutside(root: Element, isOpen: () => boolean, close: () => void, onEscape?: () => void): void {
  effect(() => {
    if (!isOpen()) return undefined
    const doc = root.ownerDocument
    const onPointer = (event: Event): void => {
      const target = event.target as Node | null
      if (target !== null && !root.contains(target)) close()
    }
    const onKey = (event: Event): void => {
      if ((event as KeyboardEvent).key !== 'Escape') return
      close()
      onEscape?.()
    }
    doc.addEventListener('pointerdown', onPointer)
    doc.addEventListener('keydown', onKey)
    return () => {
      doc.removeEventListener('pointerdown', onPointer)
      doc.removeEventListener('keydown', onKey)
    }
  })
}