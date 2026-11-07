/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { assertUniqueValues } from '../lib/collection.ts'
import type { BaseProps } from '../lib/types.ts'

export interface StepItem {
  readonly value: string
  readonly label: string
  readonly description?: string | undefined
}

export interface StepperProps extends BaseProps {
  readonly items: readonly StepItem[]
  readonly current: string | (() => string)
  readonly label?: string | undefined
}

export function Stepper(props: StepperProps): Child {
  const {
    items,
    current,
    label = 'Progress',
    class: className,
    children: _children,
    ...rest
  } = props
  assertUniqueValues(items, 'Stepper')

  const index = (): number => {
    const value = typeof current === 'function' ? current() : current
    const found = items.findIndex((item) => item.value === value)
    if (found < 0) throw new TypeError(`Unknown Stepper value '${value}'`)
    return found
  }
  index()

  return (
    <ol {...rest} aria-label={label} class={cn('gb-stepper', className)}>
      {items.map((item, position) => (
        <li
          class="gb-step"
          aria-current={() => position === index() ? 'step' : undefined}
          data-state={() => position < index() ? 'complete' : position === index() ? 'current' : 'pending'}
        >
          <span class="gb-step-number" aria-hidden="true">{position + 1}</span>
          <div>
            <span class="gb-step-label">{item.label}</span>
            {item.description === undefined ? null : (
              <p class="gb-step-description">{item.description}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}