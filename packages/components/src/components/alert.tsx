/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { createPart } from '../lib/part.ts'
import type { BaseProps } from '../lib/types.ts'
import { variants, type VariantProps } from '../lib/variants.ts'

export const alertVariants = variants({
  base: 'gb-alert',
  variants: {
    variant: { default: 'gb-alert-default', destructive: 'gb-alert-destructive' }
  },
  defaultVariants: { variant: 'default' }
})

export interface AlertProps extends BaseProps, VariantProps<typeof alertVariants> {}

/**
 * A callout. Put an icon as the first child and it is placed beside the text.
 */
export function Alert(props: AlertProps): Child {
  const { variant, class: className, children, ...rest } = props
  return (
    <div role="alert" {...rest} class={alertVariants({ variant, class: className })}>
      {children}
    </div>
  )
}

export const AlertTitle = createPart('h5', 'gb-alert-title')
export const AlertDescription = createPart('div', 'gb-alert-description')