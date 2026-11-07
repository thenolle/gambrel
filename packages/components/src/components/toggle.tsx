/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'
import { variants, type VariantProps } from '../lib/variants.ts'

export const toggleVariants = variants({
  base: 'gb-toggle',
  variants: {
    variant: { default: 'gb-toggle-default', outline: 'gb-toggle-outline' },
    size: { default: 'gb-toggle-md', sm: 'gb-toggle-sm', lg: 'gb-toggle-lg' }
  },
  defaultVariants: { variant: 'default', size: 'default' }
})

export interface ToggleProps extends BaseProps, VariantProps<typeof toggleVariants> {
  readonly pressed?: boolean | (() => boolean) | undefined
  readonly defaultPressed?: boolean | undefined
  readonly onPressedChange?: ((pressed: boolean) => void) | undefined
}

/**
 * A two-state button, announced with `aria-pressed`.
 */
export function Toggle(props: ToggleProps): Child {
  const { pressed, defaultPressed = false, onPressedChange, onClick, variant, size, class: className, children, ...rest } = props
  const state = createControllable<boolean>({ value: pressed, defaultValue: defaultPressed, onChange: onPressedChange })
  return (
    <button
      type="button"
      {...rest}
      aria-pressed={() => String(state.get())}
      data-state={() => (state.get() ? 'on' : 'off')}
      class={toggleVariants({ variant, size, class: className })}
      onClick={(event) => {
        state.set(!state.get())
        onClick?.(event)
      }}
    >
      {children}
    </button>
  )
}