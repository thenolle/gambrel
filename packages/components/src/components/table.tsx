/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createPart } from '../lib/part.ts'
import type { BaseProps } from '../lib/types.ts'

/**
 * A table inside a wrapper that scrolls horizontally when it is too wide.
 */
export function Table(props: BaseProps): Child {
  const { class: className, children, ...rest } = props
  return (
    <div class="gb-table-wrap">
      <table {...rest} class={cn('gb-table', className)}>
        {children}
      </table>
    </div>
  )
}

export const TableHeader = createPart('thead', 'gb-table-header')
export const TableBody = createPart('tbody', 'gb-table-body')
export const TableFooter = createPart('tfoot', 'gb-table-footer')
export const TableRow = createPart('tr', 'gb-table-row')
export const TableHead = createPart('th', 'gb-table-head')
export const TableCell = createPart('td', 'gb-table-cell')
export const TableCaption = createPart('caption', 'gb-table-caption')