/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import type { BaseProps } from '../lib/types.ts'
import { variants, type VariantProps } from '../lib/variants.ts'

export const buttonVariants = variants({
  base: 'gb-button',
  variants: {
    variant: {
      default: 'gb-button-default',
      secondary: 'gb-button-secondary',
      destructive: 'gb-button-destructive',
      outline: 'gb-button-outline',
      ghost: 'gb-button-ghost',
      link: 'gb-button-link'
    },
    size: {
      default: 'gb-button-md',
      sm: 'gb-button-sm',
      lg: 'gb-button-lg',
      icon: 'gb-button-icon'
    }
  },
  defaultVariants: { variant: 'default', size: 'default' }
})

export interface ButtonProps extends BaseProps, VariantProps<typeof buttonVariants> {}

/**
 * A button. `type` defaults to `button`. To style a link like a button, put
 * `buttonVariants({ variant, size })` on the `<a>` instead.
 */
export function Button(props: ButtonProps): Child {
  const { variant, size, class: className, children, type = 'button', ...rest } = props
  return (
    <button {...rest} type={type} class={buttonVariants({ variant, size, class: className })}>
      {children}
    </button>
  )
}