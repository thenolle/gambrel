/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface SwitchProps extends BaseProps {
  readonly checked?: boolean | (() => boolean) | undefined
  readonly defaultChecked?: boolean | undefined
  readonly onCheckedChange?: ((checked: boolean) => void) | undefined
}

/**
 * An on/off switch with `role="switch"`. It is a button, so it responds to Space and Enter.
 */
export function Switch(props: SwitchProps): Child {
  const { checked, defaultChecked = false, onCheckedChange, onClick, class: className, children: _children, ...rest } = props
  const state = createControllable<boolean>({ value: checked, defaultValue: defaultChecked, onChange: onCheckedChange })
  const dataState = (): string => (state.get() ? 'checked' : 'unchecked')
  return (
    <button
      type="button"
      role="switch"
      {...rest}
      aria-checked={() => String(state.get())}
      data-state={dataState}
      class={cn('gb-switch', className)}
      onClick={(event) => {
        state.set(!state.get())
        onClick?.(event)
      }}
    >
      <span class="gb-switch-thumb" data-state={dataState} />
    </button>
  )
}