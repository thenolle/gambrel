/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { dismissOutside, renderTrigger, type Trigger, type TriggerProps } from '../lib/overlay.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface PopoverProps extends BaseProps {
  readonly trigger: Trigger
  readonly open?: boolean | (() => boolean) | undefined
  readonly defaultOpen?: boolean | undefined
  readonly onOpenChange?: ((open: boolean) => void) | undefined
  readonly side?: 'top' | 'right' | 'bottom' | 'left' | undefined
  readonly align?: 'start' | 'center' | 'end' | undefined
  /**
   * Base for the element ids. Default `popover`.
   */
  readonly id?: string | undefined
}

/**
 * A floating panel next to its trigger. It closes on Escape and on a press outside.
 * It is positioned with CSS only, so it does not move to avoid the viewport edge.
 */
export function Popover(props: PopoverProps): Child {
  const {
    trigger,
    open,
    defaultOpen = false,
    onOpenChange,
    side = 'bottom',
    align = 'center',
    id = 'popover',
    class: className,
    children,
    ...rest
  } = props
  const state = createControllable<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const triggerProps: TriggerProps = {
    onClick: () => state.set(!state.get()),
    'aria-haspopup': 'dialog',
    'aria-expanded': () => String(state.get()),
    'aria-controls': id
  }
  return (
    <div
      {...rest}
      class={cn('gb-popover', className)}
      ref={(element: Element) => dismissOutside(element, state.get, () => state.set(false))}
    >
      {renderTrigger(trigger, triggerProps)}
      <div
        id={id}
        role="dialog"
        hidden={() => !state.get()}
        class={cn('gb-popover-content', `gb-popover-${side}`, `gb-popover-align-${align}`)}
      >
        {children}
      </div>
    </div>
  )
}