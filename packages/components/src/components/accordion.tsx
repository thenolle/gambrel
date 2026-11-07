/** @jsxImportSource @gambrel/view */
import { ChevronDown } from '@gambrel/icons'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface AccordionItem {
  /**
   * A short id-safe string (letters, digits, hyphens), used to build element ids.
   */
  readonly value: string
  readonly title: Child
  readonly content: Child
  readonly disabled?: boolean | undefined
}

export interface AccordionProps extends BaseProps {
  readonly items: readonly AccordionItem[]
  /**
   * `single` keeps one item open at a time, `multiple` allows several. Default `single`.
   */
  readonly type?: 'single' | 'multiple' | undefined
  /**
   * In `single` mode, allow closing the open item. Default false.
   */
  readonly collapsible?: boolean | undefined
  /**
   * The values of the open items.
   */
  readonly value?: readonly string[] | (() => readonly string[]) | undefined
  readonly defaultValue?: readonly string[] | undefined
  readonly onValueChange?: ((value: readonly string[]) => void) | undefined
  /**
   * Base for the element ids. Use a distinct one for each accordion on a page. Default `accordion`.
   */
  readonly id?: string | undefined
}

export function Accordion(props: AccordionProps): Child {
  const {
    items,
    type = 'single',
    collapsible = false,
    value,
    defaultValue = [],
    onValueChange,
    id = 'accordion',
    class: className,
    children: _children,
    ...rest
  } = props
  const state = createControllable<readonly string[]>({ value, defaultValue, onChange: onValueChange })
  const isOpen = (item: string): boolean => state.get().includes(item)

  const toggle = (item: string): void => {
    const open = state.get()
    if (open.includes(item)) {
      if (type === 'multiple' || collapsible) state.set(open.filter((entry) => entry !== item))
      return
    }
    state.set(type === 'multiple' ? [...open, item] : [item])
  }

  return (
    <div {...rest} class={cn('gb-accordion', className)}>
      {items.map((item) => (
        <div class="gb-accordion-item" data-state={() => (isOpen(item.value) ? 'open' : 'closed')}>
          <h3 class="gb-accordion-header">
            <button
              type="button"
              id={`${id}-trigger-${item.value}`}
              aria-expanded={() => String(isOpen(item.value))}
              aria-controls={`${id}-content-${item.value}`}
              disabled={item.disabled === true}
              class="gb-accordion-trigger"
              onClick={() => toggle(item.value)}
            >
              {item.title}
              <ChevronDown size={16} class="gb-accordion-chevron" />
            </button>
          </h3>
          <div
            role="region"
            id={`${id}-content-${item.value}`}
            aria-labelledby={`${id}-trigger-${item.value}`}
            hidden={() => !isOpen(item.value)}
            class="gb-accordion-content"
          >
            <div class="gb-accordion-inner">{item.content}</div>
          </div>
        </div>
      ))}
    </div>
  )
}