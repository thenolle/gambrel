/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface InputProps extends BaseProps {
  readonly type?: string | undefined
}

export function Input(props: InputProps): Child {
  const { class: className, children: _children, type = 'text', ...rest } = props
  return <input type={type} {...rest} class={cn('gb-input', className)} />
}