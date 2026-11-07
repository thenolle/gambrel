/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface MeterProps extends BaseProps {
  readonly value: number | (() => number)
  readonly min?: number | undefined
  readonly max?: number | undefined
  readonly label: string
}

/**
 * A native meter for a measurement in a known range, rather than task progress.
 */
export function Meter(props: MeterProps): Child {
  const {
    value,
    min = 0,
    max = 100,
    label,
    class: className,
    children: _children,
    ...rest
  } = props

  if (!Number.isFinite(min) || !Number.isFinite(max) || min >= max) {
    throw new RangeError('Meter requires finite bounds with min less than max')
  }

  const current = (): number => {
    const next = typeof value === 'function' ? value() : value
    if (!Number.isFinite(next)) throw new TypeError('Meter value must be finite')
    return Math.min(max, Math.max(min, next))
  }

  return (
    <meter
      {...rest}
      class={cn('gb-meter', className)}
      min={min}
      max={max}
      value={current}
      aria-label={label}
    >
      {current}
    </meter>
  )
}