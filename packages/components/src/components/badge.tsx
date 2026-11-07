/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import type { BaseProps } from '../lib/types.ts'
import { variants, type VariantProps } from '../lib/variants.ts'

export const badgeVariants = variants({
  base: 'gb-badge',
  variants: {
    variant: {
      default: 'gb-badge-default',
      secondary: 'gb-badge-secondary',
      destructive: 'gb-badge-destructive',
      outline: 'gb-badge-outline'
    }
  },
  defaultVariants: { variant: 'default' }
})

export interface BadgeProps extends BaseProps, VariantProps<typeof badgeVariants> {}

export function Badge(props: BadgeProps): Child {
  const { variant, class: className, children, ...rest } = props
  return (
    <span {...rest} class={badgeVariants({ variant, class: className })}>
      {children}
    </span>
  )
}