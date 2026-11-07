/** @jsxImportSource @gambrel/view */
import { ChevronLeft, ChevronRight } from '@gambrel/icons'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'
import { buttonVariants } from './button.tsx'

function span(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_value, index) => from + index)
}

/**
 * The page numbers to show, with `'ellipsis'` for gaps. The first and last pages are always
 * included, plus `siblings` pages on each side of the current one.
 */
export function paginationRange(page: number, pageCount: number, siblings = 1): Array<number | 'ellipsis'> {
  if (pageCount <= siblings * 2 + 5) return span(1, pageCount)
  const left = Math.max(page - siblings, 1)
  const right = Math.min(page + siblings, pageCount)
  const dotsLeft = left > 2
  const dotsRight = right < pageCount - 1
  const edge = siblings * 2 + 3
  if (!dotsLeft && dotsRight) return [...span(1, edge), 'ellipsis', pageCount]
  if (dotsLeft && !dotsRight) return [1, 'ellipsis', ...span(pageCount - edge + 1, pageCount)]
  return [1, 'ellipsis', ...span(left, right), 'ellipsis', pageCount]
}

export interface PaginationProps extends BaseProps {
  /**
   * The current page, starting at 1.
   */
  readonly page: number
  readonly pageCount: number
  /**
   * The URL of a page. Pages are real links, so they work without JavaScript.
   */
  readonly href: (page: number) => string
  readonly siblings?: number | undefined
}

export function Pagination(props: PaginationProps): Child {
  const { page, pageCount, href, siblings = 1, class: className, children: _children, ...rest } = props
  const previous = page > 1 ? <a href={href(page - 1)} aria-label="Go to previous page" class={buttonVariants({ variant: 'ghost' })}><ChevronLeft size={16} />Previous</a> : <span aria-disabled="true" class={cn(buttonVariants({ variant: 'ghost' }), 'gb-pagination-disabled')}><ChevronLeft size={16} />Previous</span>
  const next = page < pageCount ? <a href={href(page + 1)} aria-label="Go to next page" class={buttonVariants({ variant: 'ghost' })}>Next<ChevronRight size={16} /></a> : <span aria-disabled="true" class={cn(buttonVariants({ variant: 'ghost' }), 'gb-pagination-disabled')}>Next<ChevronRight size={16} /></span>
  return (
    <nav role="navigation" aria-label="pagination" {...rest} class={cn('gb-pagination', className)}>
      <ul class="gb-pagination-list">
        <li>{previous}</li>
        {paginationRange(page, pageCount, siblings).map((entry) =>
          entry === 'ellipsis' ? (
            <li class="gb-pagination-ellipsis" aria-hidden="true">…</li>
          ) : (
            <li>
              <a
                href={href(entry)}
                aria-current={entry === page ? 'page' : undefined}
                class={buttonVariants({ variant: entry === page ? 'outline' : 'ghost', size: 'icon' })}
              >
                {entry}
              </a>
            </li>
          )
        )}
        <li>{next}</li>
      </ul>
    </nav>
  )
}