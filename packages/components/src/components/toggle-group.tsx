/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'
import { toggleVariants } from './toggle.tsx'

export interface ToggleGroupItem {
  readonly value: string
  readonly label: Child
  readonly disabled?: boolean | undefined
}

export interface ToggleGroupProps extends BaseProps {
  readonly items: readonly ToggleGroupItem[]
  readonly type?: 'single' | 'multiple' | undefined
  readonly value?: readonly string[] | (() => readonly string[]) | undefined
  readonly defaultValue?: readonly string[] | undefined
  readonly onValueChange?: ((value: readonly string[]) => void) | undefined
  readonly disabled?: boolean | undefined
  readonly variant?: 'default' | 'outline' | undefined
  readonly size?: 'default' | 'sm' | 'lg' | undefined
}

/**
 * A labeled group of toggle buttons. Values are arrays in both modes.
 * Single mode permits zero or one selected item.
 */
export function ToggleGroup(props: ToggleGroupProps): Child {
  const {
    items,
    type = 'single',
    value,
    defaultValue = [],
    onValueChange,
    disabled = false,
    variant = 'default',
    size = 'default',
    class: className,
    children: _children,
    ...rest
  } = props

  const keys = items.map((item) => item.value)
  if (keys.some((key) => key === '') || new Set(keys).size !== keys.length) throw new TypeError('ToggleGroup item values must be non-empty and unique')

  const state = createControllable<readonly string[]>({
    value,
    defaultValue,
    onChange: onValueChange
  })

  const selected = (): readonly string[] => {
    const current = state.get()
    if (current.some((key) => !keys.includes(key))) throw new TypeError('ToggleGroup value contains an unknown item')
    if (new Set(current).size !== current.length) throw new TypeError('ToggleGroup value contains duplicates')
    if (type === 'single' && current.length > 1) throw new TypeError('ToggleGroup single mode accepts at most one value')
    return current
  }

  selected()

  const toggle = (key: string): void => {
    const current = selected()
    state.set(current.includes(key) ? current.filter((entry) => entry !== key) : type === 'single' ? [key] : [...current, key])
  }

  return (
    <div {...rest} role="group" class={cn('gb-toggle-group', className)}>
      {items.map((item) => (
        <button
          type="button"
          disabled={disabled || item.disabled === true}
          aria-pressed={() => String(selected().includes(item.value))}
          data-state={() => selected().includes(item.value) ? 'on' : 'off'}
          class={toggleVariants({ variant, size })}
          onClick={() => {
            if (!disabled && item.disabled !== true) toggle(item.value)
          }}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}