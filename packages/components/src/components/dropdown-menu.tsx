/** @jsxImportSource @gambrel/view */
import { effect } from '@gambrel/reactivity'
import type { Child, ViewEvent } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { dismissOutside, renderTrigger, type Trigger, type TriggerProps } from '../lib/overlay.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

export type MenuItem =
  | {
      readonly type?: 'item' | undefined
      readonly label: Child
      readonly onSelect?: (() => void) | undefined
      readonly disabled?: boolean | undefined
      readonly shortcut?: string | undefined
      readonly destructive?: boolean | undefined
    }
  | { readonly type: 'separator' }
  | { readonly type: 'label'; readonly label: Child }

export interface DropdownMenuProps extends BaseProps {
  readonly trigger: Trigger
  readonly items: readonly MenuItem[]
  readonly open?: boolean | (() => boolean) | undefined
  readonly defaultOpen?: boolean | undefined
  readonly onOpenChange?: ((open: boolean) => void) | undefined
  readonly align?: 'start' | 'center' | 'end' | undefined
  /**
   * Base for the element ids. Default `menu`.
   */
  readonly id?: string | undefined
}

/**
 * A menu of actions. ArrowUp, ArrowDown, Home and End move between items; Escape closes it
 * and returns focus to the trigger; choosing an item calls its `onSelect` and closes it.
 */
export function DropdownMenu(props: DropdownMenuProps): Child {
  const { trigger, items, open, defaultOpen = false, onOpenChange, align = 'start', id = 'menu', class: className, children: _children, ...rest } = props
  const state = createControllable<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const triggerProps: TriggerProps = {
    onClick: () => state.set(!state.get()),
    'aria-haspopup': 'menu',
    'aria-expanded': () => String(state.get()),
    'aria-controls': id
  }

  const onMenuKey = (event: ViewEvent): void => {
    const key = (event as unknown as KeyboardEvent).key
    const menu = event.currentTarget as HTMLElement
    if (key === 'Tab') {
      state.set(false)
      return
    }
    const entries = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])'))
    if (entries.length === 0) return
    const index = entries.indexOf(menu.ownerDocument.activeElement as HTMLElement)
    let next: HTMLElement | undefined
    if (key === 'ArrowDown') next = entries[(index + 1) % entries.length]
    else if (key === 'ArrowUp') next = entries[(index - 1 + entries.length) % entries.length]
    else if (key === 'Home') next = entries[0]
    else if (key === 'End') next = entries[entries.length - 1]
    if (next === undefined) return
    event.preventDefault()
    next.focus()
  }

  return (
    <div
      {...rest}
      class={cn('gb-popover', className)}
      ref={(element: Element) => {
        const focusTrigger = (): void => element.querySelector<HTMLElement>('[aria-haspopup]')?.focus()
        dismissOutside(element, state.get, () => state.set(false), focusTrigger)
        effect(() => {
          if (state.get()) element.querySelector<HTMLElement>('[role="menuitem"]:not([disabled])')?.focus()
        })
      }}
    >
      {renderTrigger(trigger, triggerProps)}
      <div
        id={id}
        role="menu"
        hidden={() => !state.get()}
        class={cn('gb-popover-content', 'gb-menu', 'gb-popover-bottom', `gb-popover-align-${align}`)}
        onKeyDown={onMenuKey}
      >
        {items.map((item) => {
          if (item.type === 'separator') return <div role="separator" class="gb-menu-separator" />
          if (item.type === 'label') return <div class="gb-menu-label">{item.label}</div>
          return (
            <button
              type="button"
              role="menuitem"
              tabindex="-1"
              disabled={item.disabled === true}
              class={cn('gb-menu-item', item.destructive === true && 'gb-menu-item-destructive')}
              onClick={() => {
                item.onSelect?.()
                state.set(false)
              }}
            >
              <span>{item.label}</span>
              {item.shortcut === undefined ? null : <span class="gb-menu-shortcut">{item.shortcut}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}