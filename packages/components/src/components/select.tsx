/** @jsxImportSource @gambrel/view */
import { ChevronDown } from '@gambrel/icons'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface SelectOption {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean | undefined
}

export interface SelectProps extends BaseProps {
  /**
   * Options to render. Without `options`, pass `<option>` children and the select works natively.
   */
  readonly options?: readonly SelectOption[] | undefined
  readonly value?: string | (() => string) | undefined
  readonly defaultValue?: string | undefined
  readonly onValueChange?: ((value: string) => void) | undefined
  /**
   * A disabled first option shown while nothing is selected.
   */
  readonly placeholder?: string | undefined
}

/**
 * A native select, styled. With `options`, the selected option is rendered into the HTML,
 * so the server and browser agree from the first paint.
 */
export function Select(props: SelectProps): Child {
  const { options, value, defaultValue = '', onValueChange, placeholder, onChange, class: className, children, ...rest } = props
  const state = createControllable<string>({ value, defaultValue, onChange: onValueChange })
  const content =
    options === undefined
      ? children
      : [
          placeholder === undefined ? null : (
            <option value="" disabled selected={() => state.get() === ''}>
              {placeholder}
            </option>
          ),
          ...options.map((option) => (
            <option value={option.value} disabled={option.disabled === true} selected={() => state.get() === option.value}>
              {option.label}
            </option>
          ))
        ]
  return (
    <div class="gb-select-wrap">
      <select
        {...rest}
        class={cn('gb-select', className)}
        onChange={(event) => {
          state.set((event.currentTarget as HTMLSelectElement).value)
          onChange?.(event)
        }}
      >
        {content}
      </select>
      <ChevronDown class="gb-select-icon" size={16} />
    </div>
  )
}