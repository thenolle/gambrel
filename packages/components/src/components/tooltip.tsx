/** @jsxImportSource @gambrel/view */
import { onCleanup, signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface TooltipProps extends BaseProps {
  readonly content: Child
  readonly side?: 'top' | 'right' | 'bottom' | 'left' | undefined
  readonly delay?: number | undefined
  readonly id?: string | undefined
}

export function Tooltip(props: TooltipProps): Child {
  const {
    content,
    side = 'top',
    delay = 0,
    id = 'tooltip',
    class: className,
    children,
    ...rest
  } = props

  if (!Number.isFinite(delay) || delay < 0) {
    throw new RangeError('Tooltip delay must be a non-negative finite number')
  }

  const visible = signal(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let hovered = false
  let focused = false
  let disposed = false

  const descriptions = new Map<Element, string | null>()

  const clearTimer = (): void => {
    clearTimeout(timer)
    timer = undefined
  }

  const update = (): void => {
    clearTimer()

    if (disposed || (!hovered && !focused)) {
      visible.set(false)
      return
    }

    if (delay === 0) {
      visible.set(true)
      return
    }

    timer = setTimeout(() => {
      timer = undefined
      if (!disposed && (hovered || focused)) visible.set(true)
    }, delay)
  }

  const describe = (target: Element): void => {
    if (descriptions.has(target)) return
    const previous = target.getAttribute('aria-describedby')
    descriptions.set(target, previous)
    const values = new Set((previous ?? '').split(/\s+/).filter(Boolean))
    values.add(id)
    target.setAttribute('aria-describedby', [...values].join(' '))
  }

  const restoreDescriptions = (): void => {
    for (const [element, previous] of descriptions) {
      if (previous === null) element.removeAttribute('aria-describedby')
      else element.setAttribute('aria-describedby', previous)
    }
    descriptions.clear()
  }

  return (
    <span
      {...rest}
      aria-describedby={id}
      class={cn('gb-tooltip', className)}
      ref={() => {
        onCleanup(() => {
          disposed = true
          clearTimer()
          restoreDescriptions()
        })
      }}
      onMouseEnter={() => {
        hovered = true
        update()
      }}
      onMouseLeave={() => {
        hovered = false
        update()
      }}
      onFocusIn={(event) => {
        focused = true
        const target = event.target as Element | null
        if (target !== null && target !== event.currentTarget) describe(target)
        update()
      }}
      onFocusOut={(event) => {
        const wrapper = event.currentTarget as Element
        const next = (event as unknown as FocusEvent).relatedTarget as Node | null
        if (next !== null && wrapper.contains(next)) return
        focused = false
        update()
      }}
      onKeyDown={(event) => {
        if ((event as unknown as KeyboardEvent).key !== 'Escape') return
        clearTimer()
        visible.set(false)
      }}
    >
      {children}
      <span
        id={id}
        role="tooltip"
        hidden={() => !visible()}
        class={cn('gb-tooltip-content', `gb-tooltip-${side}`)}
      >
        {content}
      </span>
    </span>
  )
}