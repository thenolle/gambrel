/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface DisclosureProps extends BaseProps {
  readonly summary: Child
  readonly defaultOpen?: boolean | undefined
  readonly onOpenChange?: ((open: boolean) => void) | undefined
}

/**
 * Native details/summary disclosure. The browser owns its open state.
 */
export function Disclosure(props: DisclosureProps): Child {
  const {
    summary,
    defaultOpen = false,
    onOpenChange,
    onToggle,
    class: className,
    children,
    ...rest
  } = props

  if ('open' in rest) {
    throw new TypeError('Disclosure uses defaultOpen; use Collapsible for controlled state')
  }

  return (
    <details
      {...rest}
      open={defaultOpen}
      class={cn('gb-disclosure', className)}
      onToggle={(event) => {
        onOpenChange?.((event.currentTarget as HTMLDetailsElement).open)
        if (typeof onToggle === 'function') {
          (onToggle as (event: unknown) => void)(event)
        }
      }}
    >
      <summary class="gb-disclosure-summary">{summary}</summary>
      <div class="gb-disclosure-content">{children}</div>
    </details>
  )
}