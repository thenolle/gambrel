/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

/**
 * A native radio input, styled. Give radios the same `name` to group them.
 */
export function Radio(props: BaseProps): Child {
  const { class: className, children: _children, ...rest } = props
  return <input type="radio" {...rest} class={cn('gb-radio', className)} />
}

export interface RadioOption {
  readonly value: string
  readonly label: Child
  readonly disabled?: boolean | undefined
}

export interface RadioGroupProps extends BaseProps {
  readonly name: string
  readonly options: readonly RadioOption[]
  readonly value?: string | (() => string) | undefined
  readonly defaultValue?: string | undefined
  readonly onValueChange?: ((value: string) => void) | undefined
  readonly orientation?: 'vertical' | 'horizontal' | undefined
}

/**
 * A group of radios built from `options`. Control it with `value` or let it manage itself.
 */
export function RadioGroup(props: RadioGroupProps): Child {
  const { name, options, value, defaultValue = '', onValueChange, orientation = 'vertical', class: className, children: _children, ...rest } = props
  const state = createControllable<string>({ value, defaultValue, onChange: onValueChange })
  return (
    <div role="radiogroup" {...rest} class={cn('gb-radio-group', `gb-radio-group-${orientation}`, className)}>
      {options.map((option) => (
        <label class="gb-radio-option">
          <input
            type="radio"
            class="gb-radio"
            name={name}
            value={option.value}
            disabled={option.disabled === true}
            checked={() => state.get() === option.value}
            onChange={() => state.set(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  )
}