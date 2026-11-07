/** @jsxImportSource @gambrel/view */
import { LoaderCircle } from '@gambrel/icons'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'

export interface SpinnerProps {
  readonly size?: number | undefined
  readonly class?: string | undefined
  /**
   * The accessible name. Default `Loading`.
   */
  readonly label?: string | undefined
}

export function Spinner(props: SpinnerProps): Child {
  const { size = 16, class: className, label = 'Loading' } = props
  return <LoaderCircle size={size} class={cn('gb-spinner', className)} role="status" aria-label={label} />
}