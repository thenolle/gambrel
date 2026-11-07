/** @jsxImportSource @gambrel/view */
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { assertComponentId, assertUniqueValues, normalizeSearch } from '../lib/collection.ts'
import type { BaseProps } from '../lib/types.ts'

export interface CommandItem {
  readonly value: string
  readonly label: string
  readonly keywords?: readonly string[] | undefined
  readonly group?: string | undefined
  readonly disabled?: boolean | undefined
  readonly onSelect?: (() => void) | undefined
}

export interface CommandProps extends BaseProps {
  readonly id: string
  readonly items: readonly CommandItem[]
  readonly label?: string | undefined
  readonly placeholder?: string | undefined
  readonly emptyText?: string | undefined
  readonly onValueSelect?: ((value: string) => void) | undefined
}

export function Command(props: CommandProps): Child {
  const {
    id,
    items,
    label = 'Commands',
    placeholder = 'Search commands…',
    emptyText = 'No matching commands.',
    onValueSelect,
    class: className,
    children: _children,
    ...rest
  } = props

  assertComponentId(id, 'Command')
  assertUniqueValues(items, 'Command')

  const query = signal('')
  const active = signal<string | null>(null)
  const itemId = (item: CommandItem): string => `${id}-item-${items.indexOf(item)}`

  const results = (): readonly CommandItem[] => {
    const search = normalizeSearch(query())
    return items.filter((item) => normalizeSearch([item.label, ...(item.keywords ?? [])].join(' ')).includes(search))
  }

  const enabled = (): readonly CommandItem[] => results().filter((item) => item.disabled !== true)

  const current = (): CommandItem | undefined => enabled().find((item) => item.value === active()) ?? enabled()[0]

  const choose = (item: CommandItem): void => {
    if (item.disabled === true) return
    item.onSelect?.()
    onValueSelect?.(item.value)
  }

  const move = (key: string): boolean => {
    const list = enabled()
    if (list.length === 0) return false
    const index = list.findIndex((item) => item.value === current()?.value)
    const target = key === 'Home' ? list[0] : key === 'End' ? list[list.length - 1] : key === 'ArrowDown' ? list[(index + 1) % list.length] : key === 'ArrowUp' ? list[(index - 1 + list.length) % list.length] : undefined
    if (target === undefined) return false
    active.set(target.value)
    return true
  }

  return (
    <div {...rest} class={cn('gb-command', className)}>
      <input
        type="search"
        class="gb-command-input"
        role="combobox"
        aria-label={label}
        aria-autocomplete="list"
        aria-expanded="true"
        aria-controls={`${id}-list`}
        aria-activedescendant={() => {
          const item = current()
          return item === undefined ? undefined : itemId(item)
        }}
        placeholder={placeholder}
        value={query}
        onInput={(event) => {
          query.set((event.currentTarget as HTMLInputElement).value)
          active.set(null)
        }}
        onKeyDown={(event) => {
          const key = (event as unknown as KeyboardEvent).key
          if (move(key)) event.preventDefault()
          else if (key === 'Enter') {
            event.preventDefault()
            const item = current()
            if (item !== undefined) choose(item)
          }
        }}
      />
      <div id={`${id}-list`} role="listbox" aria-label={label} class="gb-command-list">
        {() => {
          const list = results()
          if (list.length === 0) return <p class="gb-command-empty" role="status">{emptyText}</p>
          let previousGroup: string | undefined
          return list.map((item) => {
            const heading = item.group !== undefined && item.group !== previousGroup ? <div class="gb-command-heading" role="presentation">{item.group}</div> : null
            previousGroup = item.group
            return [
              heading,
              <div
                id={itemId(item)}
                role="option"
                aria-selected={() => String(current()?.value === item.value)}
                aria-disabled={item.disabled === true ? 'true' : undefined}
                class="gb-command-option"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(item)}
              >
                {item.label}
              </div>
            ]
          })
        }}
      </div>
    </div>
  )
}