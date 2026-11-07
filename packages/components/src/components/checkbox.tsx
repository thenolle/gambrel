/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface CheckboxProps extends BaseProps {
  /**
   * Controls the checkbox from outside: a boolean or an accessor such as a signal.
   */
  readonly checked?: boolean | (() => boolean) | undefined
  readonly defaultChecked?: boolean | undefined
  readonly onCheckedChange?: ((checked: boolean) => void) | undefined
}

/**
 * A native checkbox, styled. Form submission, labels and autofill work as usual.
 */
export function Checkbox(props: CheckboxProps): Child {
  const { checked, defaultChecked = false, onCheckedChange, onChange, class: className, children: _children, ...rest } = props
  const state = createControllable<boolean>({ value: checked, defaultValue: defaultChecked, onChange: onCheckedChange })
  return (
    <input
      type="checkbox"
      {...rest}
      class={cn('gb-checkbox', className)}
      checked={state.get}
      onChange={(event) => {
        state.set((event.currentTarget as HTMLInputElement).checked)
        onChange?.(event)
      }}
    />
  )
}