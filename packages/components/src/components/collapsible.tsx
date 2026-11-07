/** @jsxImportSource @gambrel/view */
import { ChevronsUpDown } from '@gambrel/icons'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface CollapsibleProps extends BaseProps {
  /**
   * The content of the button that opens and closes the panel.
   */
  readonly trigger: Child
  readonly open?: boolean | (() => boolean) | undefined
  readonly defaultOpen?: boolean | undefined
  readonly onOpenChange?: ((open: boolean) => void) | undefined
  /**
   * Base for the element ids. Default `collapsible`.
   */
  readonly id?: string | undefined
}

export function Collapsible(props: CollapsibleProps): Child {
  const { trigger, open, defaultOpen = false, onOpenChange, id = 'collapsible', class: className, children, ...rest } = props
  const state = createControllable<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  return (
    <div {...rest} class={cn('gb-collapsible', className)} data-state={() => (state.get() ? 'open' : 'closed')}>
      <button
        type="button"
        id={`${id}-trigger`}
        aria-expanded={() => String(state.get())}
        aria-controls={`${id}-content`}
        class="gb-collapsible-trigger"
        onClick={() => state.set(!state.get())}
      >
        {trigger}
        <ChevronsUpDown size={16} />
      </button>
      <div id={`${id}-content`} hidden={() => !state.get()} class="gb-collapsible-content">
        {children}
      </div>
    </div>
  )
}