/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { assertUniqueValues } from '../lib/collection.ts'
import type { BaseProps } from '../lib/types.ts'

export interface TimelineItem {
  readonly value: string
  readonly title: string
  readonly description?: Child
  readonly dateTime?: string | undefined
  readonly dateLabel?: string | undefined
}

export interface TimelineProps extends BaseProps {
  readonly items: readonly TimelineItem[]
}

export function Timeline(props: TimelineProps): Child {
  const { items, class: className, children: _children, ...rest } = props
  assertUniqueValues(items, 'Timeline')

  return (
    <ol {...rest} class={cn('gb-timeline', className)}>
      {items.map((item) => (
        <li class="gb-timeline-item">
          <span class="gb-timeline-dot" aria-hidden="true"></span>
          <div class="gb-timeline-body">
            <p class="gb-timeline-title">{item.title}</p>
            {item.dateLabel === undefined ? null : (
              <time class="gb-timeline-date" datetime={item.dateTime}>
                {item.dateLabel}
              </time>
            )}
            {item.description === undefined ? null : (
              <div class="gb-timeline-description">{item.description}</div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}