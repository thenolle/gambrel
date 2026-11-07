/** @jsxImportSource @gambrel/view */
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { assertComponentId, assertUniqueValues, normalizeSearch } from '../lib/collection.ts'
import { bindFormReset, createInputState } from '../lib/input-state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface ComboboxOption {
  readonly value: string
  readonly label: string
  readonly disabled?: boolean | undefined
}

export interface ComboboxProps extends BaseProps {
  readonly id: string
  readonly label: string
  readonly options: readonly ComboboxOption[]
  readonly value?: string | (() => string) | undefined
  readonly defaultValue?: string | undefined
  readonly onValueChange?: ((value: string) => void) | undefined
  readonly name?: string | undefined
  readonly disabled?: boolean | undefined
  readonly placeholder?: string | undefined
  readonly emptyText?: string | undefined
}

export function Combobox(props: ComboboxProps): Child {
  const {
    id,
    label,
    options,
    value,
    defaultValue = '',
    onValueChange,
    name,
    disabled = false,
    placeholder = 'Choose an option…',
    emptyText = 'No matching options.',
    class: className,
    children: _children,
    ...rest
  } = props

  assertComponentId(id, 'Combobox')
  assertUniqueValues(options, 'Combobox')
  if (options.some((option) => option.value === '')) throw new TypeError('Combobox reserves the empty value for no selection')

  const state = createInputState({ value, defaultValue, onChange: onValueChange })
  const open = signal(false)
  const query = signal('')
  const active = signal<string | null>(null)
  let input: HTMLInputElement | undefined

  const selectedLabel = (): string => {
    const selected = state.get()
    if (selected === '') return ''
    const option = options.find((item) => item.value === selected)
    if (option === undefined) throw new TypeError(`Unknown Combobox value '${selected}'`)
    return option.label
  }
  selectedLabel()

  const matches = (): readonly ComboboxOption[] => {
    const search = normalizeSearch(query())
    return options.filter((option) => normalizeSearch(option.label).includes(search))
  }

  const enabled = (): readonly ComboboxOption[] => matches().filter((option) => option.disabled !== true)

  const current = (): ComboboxOption | undefined => enabled().find((option) => option.value === active()) ?? enabled()[0]

  const optionId = (option: ComboboxOption): string => `${id}-option-${options.indexOf(option)}`

  const choose = (option: ComboboxOption): void => {
    if (disabled || option.disabled === true) return
    state.set(option.value)
    open.set(false)
    query.set('')
    active.set(null)
    if (input !== undefined) input.value = selectedLabel()
  }

  return (
    <div {...rest} class={cn('gb-combobox', className)}>
      {name === undefined ? null : <input type="hidden" name={name} value={state.get} disabled={disabled} />}
      <input
        id={id}
        type="text"
        role="combobox"
        autocomplete="off"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded={() => String(open())}
        aria-controls={`${id}-list`}
        aria-activedescendant={() => {
          const option = current()
          return open() && option !== undefined ? optionId(option) : undefined
        }}
        class="gb-input"
        disabled={disabled}
        placeholder={placeholder}
        value={() => open() ? query() : selectedLabel()}
        ref={(element: Element) => {
          input = element as HTMLInputElement
          const field = input
          bindFormReset(field, () => {
            state.reset()
            open.set(false)
            query.set('')
            active.set(null)
            field.value = selectedLabel()
          })
        }}
        onFocus={() => {
          query.set('')
          active.set(null)
          open.set(true)
        }}
        onBlur={() => {
          open.set(false)
          query.set('')
          if (input !== undefined) input.value = selectedLabel()
        }}
        onInput={(event) => {
          query.set((event.currentTarget as HTMLInputElement).value)
          active.set(null)
          open.set(true)
        }}
        onKeyDown={(event) => {
          const key = (event as unknown as KeyboardEvent).key
          if (key === 'Escape') {
            event.preventDefault()
            open.set(false)
            query.set('')
            return
          }
          if (key === 'Enter' && open()) {
            event.preventDefault()
            const option = current()
            if (option !== undefined) choose(option)
            return
          }
          if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) return
          event.preventDefault()
          open.set(true)
          const list = enabled()
          if (list.length === 0) return
          const index = list.findIndex((option) => option.value === current()?.value)
          const target = key === 'Home' ? list[0] : key === 'End' ? list[list.length - 1] : key === 'ArrowDown' ? list[(index + 1) % list.length] : list[(index - 1 + list.length) % list.length]
          if (target !== undefined) active.set(target.value)
        }}
      />
      <div
        id={`${id}-list`}
        role="listbox"
        aria-label={label}
        hidden={() => !open()}
        class="gb-combobox-list"
      >
        {() => matches().length === 0 ? <p class="gb-command-empty" role="status">{emptyText}</p> : matches().map((option) => (
          <div
            id={optionId(option)}
            role="option"
            aria-selected={() => String(state.get() === option.value)}
            aria-disabled={option.disabled === true ? 'true' : undefined}
            data-active={() => current()?.value === option.value ? 'true' : undefined}
            class="gb-combobox-option"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(option)}
          >
            {option.label}
          </div>
        ))}
      </div>
    </div>
  )
}