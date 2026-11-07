/** @jsxImportSource @gambrel/view */
import { Search, X } from '@gambrel/icons'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { bindFormReset, createInputState } from '../lib/input-state.ts'
import type { BaseProps } from '../lib/types.ts'
import { InputGroup, InputGroupAddon, InputGroupButton } from './input-group.tsx'

export interface SearchInputProps extends BaseProps {
  readonly value?: string | (() => string) | undefined
  readonly defaultValue?: string | undefined
  readonly onValueChange?: ((value: string) => void) | undefined
  readonly disabled?: boolean | undefined
  readonly clearLabel?: string | undefined
  readonly ref?: ((element: Element) => void) | undefined
}

/**
 * A native search input with an optional clear action.
 */
export function SearchInput(props: SearchInputProps): Child {
  const {
    value,
    defaultValue = '',
    onValueChange,
    disabled = false,
    clearLabel = 'Clear search',
    onInput,
    ref,
    class: className,
    children: _children,
    ...rest
  } = props
  const state = createInputState({ value, defaultValue, onChange: onValueChange })
  let input: HTMLInputElement | undefined

  return (
    <InputGroup class="gb-search-input">
      <InputGroupAddon>
        <Search size={16} />
      </InputGroupAddon>
      <input
        {...rest}
        type="search"
        disabled={disabled}
        class={cn('gb-input', className)}
        value={state.get}
        ref={(element: Element) => {
          input = element as HTMLInputElement
          const current = input
          bindFormReset(current, () => {
            state.reset()
            current.value = state.get()
          })
          ref?.(element)
        }}
        onInput={(event) => {
          const target = event.currentTarget as HTMLInputElement
          state.set(target.value)
          onInput?.(event)
          target.value = state.get()
        }}
      />
      <InputGroupButton
        hidden={() => state.get() === ''}
        disabled={disabled}
        aria-label={clearLabel}
        onClick={() => {
          state.set('')
          if (input !== undefined) {
            input.value = state.get()
            input.focus()
          }
        }}
      >
        <X size={16} />
      </InputGroupButton>
    </InputGroup>
  )
}