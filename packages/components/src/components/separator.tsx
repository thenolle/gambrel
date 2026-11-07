/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface SeparatorProps extends BaseProps {
  readonly orientation?: 'horizontal' | 'vertical' | undefined
  /**
   * Purely visual (default). Set to false to expose it to assistive technology as a separator.
   */
  readonly decorative?: boolean | undefined
}

export function Separator(props: SeparatorProps): Child {
  const { orientation = 'horizontal', decorative = true, class: className, children: _children, ...rest } = props
  const semantics = decorative ? { role: 'none' } : { role: 'separator', 'aria-orientation': orientation }
  return <div {...semantics} {...rest} class={cn('gb-separator', `gb-separator-${orientation}`, className)} />
}