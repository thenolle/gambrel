/** @jsxImportSource @gambrel/view */
import type { Child, ViewEvent } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface TabItem {
  /**
   * A short id-safe string (letters, digits, hyphens). It is used to build element ids.
   */
  readonly value: string
  readonly label: Child
  readonly content: Child
  readonly disabled?: boolean | undefined
}

export interface TabsProps extends BaseProps {
  readonly items: readonly TabItem[]
  readonly value?: string | (() => string) | undefined
  readonly defaultValue?: string | undefined
  readonly onValueChange?: ((value: string) => void) | undefined
  /**
   * Base for the element ids. Use a distinct one for each tabs component on a page. Default `tabs`.
   */
  readonly id?: string | undefined
}

/**
 * Tabs with the ARIA tabs pattern: roving tabindex, and the arrow keys, Home and End move
 * between enabled tabs. Every panel is rendered; inactive ones are hidden.
 */
export function Tabs(props: TabsProps): Child {
  const { items, value, defaultValue, onValueChange, id = 'tabs', class: className, children: _children, ...rest } = props
  const enabled = items.filter((item) => item.disabled !== true)
  const state = createControllable<string>({
    value,
    defaultValue: defaultValue ?? enabled[0]?.value ?? '',
    onChange: onValueChange
  })

  const move = (event: ViewEvent, current: string): void => {
    const key = (event as unknown as KeyboardEvent).key
    const index = enabled.findIndex((item) => item.value === current)
    let target = undefined as TabItem | undefined
    if (key === 'ArrowRight') target = enabled[(index + 1) % enabled.length]
    else if (key === 'ArrowLeft') target = enabled[(index - 1 + enabled.length) % enabled.length]
    else if (key === 'Home') target = enabled[0]
    else if (key === 'End') target = enabled[enabled.length - 1]
    if (target === undefined) return
    event.preventDefault()
    state.set(target.value)
    const list = (event.currentTarget as HTMLElement).parentElement
    const next = list === null ? undefined : Array.from(list.children).find((tab) => tab.getAttribute('data-value') === target.value)
    if (next !== undefined) (next as HTMLElement).focus()
  }

  return (
    <div {...rest} class={cn('gb-tabs', className)}>
      <div role="tablist" class="gb-tabs-list">
        {items.map((item) => (
          <button
            type="button"
            role="tab"
            id={`${id}-tab-${item.value}`}
            data-value={item.value}
            aria-selected={() => String(state.get() === item.value)}
            aria-controls={`${id}-panel-${item.value}`}
            tabindex={() => (state.get() === item.value ? 0 : -1)}
            disabled={item.disabled === true}
            data-state={() => (state.get() === item.value ? 'active' : 'inactive')}
            class="gb-tabs-trigger"
            onClick={() => state.set(item.value)}
            onKeyDown={(event) => move(event, item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.map((item) => (
        <div
          role="tabpanel"
          id={`${id}-panel-${item.value}`}
          aria-labelledby={`${id}-tab-${item.value}`}
          tabindex="0"
          hidden={() => state.get() !== item.value}
          class="gb-tabs-content"
        >
          {item.content}
        </div>
      ))}
    </div>
  )
}