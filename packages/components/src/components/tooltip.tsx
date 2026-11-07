/** @jsxImportSource @gambrel/view */
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface TooltipProps extends BaseProps {
  readonly content: Child
  readonly side?: 'top' | 'right' | 'bottom' | 'left' | undefined
  /**
   * Milliseconds to wait before showing. Default 0.
   */
  readonly delay?: number | undefined
  /**
   * The tooltip element id, referenced by `aria-describedby`. Default `tooltip`.
   */
  readonly id?: string | undefined
}

/**
 * A short hint shown on hover and keyboard focus, hidden on leave, blur and Escape.
 * Wrap the element that gets the hint; do not put essential information only in a tooltip.
 */
export function Tooltip(props: TooltipProps): Child {
  const { content, side = 'top', delay = 0, id = 'tooltip', class: className, children, ...rest } = props
  const visible = signal(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  const show = (): void => {
    clearTimeout(timer)
    if (delay <= 0) visible.set(true)
    else timer = setTimeout(() => visible.set(true), delay)
  }
  const hide = (): void => {
    clearTimeout(timer)
    visible.set(false)
  }
  return (
    <span
      {...rest}
      aria-describedby={id}
      class={cn('gb-tooltip', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocusIn={show}
      onFocusOut={hide}
      onKeyDown={(event) => {
        if ((event as unknown as KeyboardEvent).key === 'Escape') hide()
      }}
    >
      {children}
      <span id={id} role="tooltip" hidden={() => !visible()} class={cn('gb-tooltip-content', `gb-tooltip-${side}`)}>
        {content}
      </span>
    </span>
  )
}