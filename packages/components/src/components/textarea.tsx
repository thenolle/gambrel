/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export function Textarea(props: BaseProps): Child {
  const { class: className, children, ...rest } = props
  return (
    <textarea {...rest} class={cn('gb-textarea', className)}>
      {children}
    </textarea>
  )
}