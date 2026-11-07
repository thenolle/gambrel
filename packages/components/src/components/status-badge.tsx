/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export interface StatusBadgeProps extends BaseProps {
  readonly tone?: StatusTone | undefined
}

const tones: Readonly<Record<StatusTone, string>> = {
  neutral: 'gb-status-neutral',
  success: 'gb-status-success',
  warning: 'gb-status-warning',
  danger: 'gb-status-danger',
  info: 'gb-status-info'
}

export function StatusBadge(props: StatusBadgeProps): Child {
  const {
    tone = 'neutral',
    class: className,
    children,
    ...rest
  } = props

  return (
    <span {...rest} class={cn('gb-status-badge', tones[tone], className)}>
      <span class="gb-status-dot" aria-hidden="true"></span>
      {children}
    </span>
  )
}