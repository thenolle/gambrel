/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createPart } from '../lib/part.ts'
import type { BaseProps } from '../lib/types.ts'
import { Button, type ButtonProps } from './button.tsx'

export const InputGroup = createPart('div', 'gb-input-group')

export interface InputGroupAddonProps extends BaseProps {
  readonly align?: 'start' | 'end' | undefined
}

export function InputGroupAddon(props: InputGroupAddonProps): Child {
  const { align = 'start', class: className, children, ...rest } = props
  return (
    <span {...rest} class={cn('gb-input-group-addon', `gb-input-group-addon-${align}`, className)}>
      {children}
    </span>
  )
}

export function InputGroupButton(props: ButtonProps): Child {
  const { class: className, variant = 'ghost', size = 'sm', ...rest } = props
  return (
    <Button
      {...rest}
      variant={variant}
      size={size}
      class={cn('gb-input-group-button', className)}
    />
  )
}