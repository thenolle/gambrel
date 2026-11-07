/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface ProgressProps extends BaseProps {
  /**
   * The current value, or an accessor such as a signal. Clamped between 0 and `max`.
   */
  readonly value?: number | (() => number) | undefined
  readonly max?: number | undefined
}

export function Progress(props: ProgressProps): Child {
  const { value = 0, max = 100, class: className, children: _children, ...rest } = props
  const current = (): number => {
    const raw = typeof value === 'function' ? value() : value
    return Math.min(max, Math.max(0, raw))
  }
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={current}
      {...rest}
      class={cn('gb-progress', className)}
    >
      <div class="gb-progress-indicator" style={() => `transform: translateX(-${100 - (current() / max) * 100}%)`} />
    </div>
  )
}