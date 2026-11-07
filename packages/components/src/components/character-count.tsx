/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface CharacterCountProps extends BaseProps {
  readonly value: string | (() => string)
  readonly max?: number | undefined
}

/**
 * Counts Unicode code points, not grapheme clusters or UTF-16 code units.
 */
export function CharacterCount(props: CharacterCountProps): Child {
  const {
    value,
    max,
    class: className,
    children: _children,
    ...rest
  } = props

  if (max !== undefined && (!Number.isInteger(max) || max < 0)) {
    throw new RangeError('CharacterCount max must be a non-negative integer')
  }

  const count = (): number =>
    Array.from(typeof value === 'function' ? value() : value).length

  return (
    <span
      {...rest}
      class={cn('gb-character-count', className)}
      data-over-limit={() => max !== undefined && count() > max ? 'true' : undefined}
    >
      {() => max === undefined ? `${count()}` : `${count()} / ${max}`}
    </span>
  )
}