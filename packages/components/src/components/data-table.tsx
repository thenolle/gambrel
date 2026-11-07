/** @jsxImportSource @gambrel/view */
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { Button } from './button.tsx'
import type { BaseProps } from '../lib/types.ts'

export interface DataColumn<T> {
  readonly id: string
  readonly header: string
  readonly text: (row: T) => string
  readonly cell?: ((row: T) => Child) | undefined
  readonly compare?: ((a: T, b: T) => number) | undefined
}

export interface DataTableProps<T> extends BaseProps {
  readonly rows: readonly T[] | (() => readonly T[])
  readonly columns: readonly DataColumn<T>[]
  readonly caption: string
  readonly pageSize?: number | undefined
  readonly filterLabel?: string | undefined
  readonly emptyText?: string | undefined
}

type Sort = { readonly id: string; readonly descending: boolean } | null

export function DataTable<T>(props: DataTableProps<T>): Child {
  const {
    rows,
    columns,
    caption,
    pageSize = 10,
    filterLabel = 'Filter rows',
    emptyText = 'No matching rows.',
    class: className,
    children: _children,
    ...rest
  } = props

  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new RangeError('DataTable pageSize must be a positive integer')
  }
  const ids = columns.map((column) => column.id)
  if (columns.length === 0 || ids.some((id) => id === '') || new Set(ids).size !== ids.length) {
    throw new TypeError('DataTable requires columns with unique non-empty ids')
  }

  const query = signal('')
  const sort = signal<Sort>(null)
  const page = signal(0)

  const filtered = (): T[] => {
    const search = query().toLocaleLowerCase().trim()
    const source = typeof rows === 'function' ? rows() : rows
    const list = source.filter((row) =>
      search === '' || columns.some((column) => column.text(row).toLocaleLowerCase().includes(search))
    )
    const order = sort()
    if (order !== null) {
      const column = columns.find((entry) => entry.id === order.id)
      if (column?.compare !== undefined) {
        const compare = column.compare
        list.sort((a, b) => order.descending ? -compare(a, b) : compare(a, b))
      }
    }
    return list
  }

  const cycle = (id: string): void => {
    const previous = sort()
    sort.set(previous?.id !== id
      ? { id, descending: false }
      : !previous.descending
        ? { id, descending: true }
        : null)
    page.set(0)
  }

  return (
    <div {...rest} class={cn('gb-data-table', className)}>
      <input
        type="search"
        class="gb-input"
        aria-label={filterLabel}
        placeholder={filterLabel}
        value={query}
        onInput={(event) => {
          query.set((event.currentTarget as HTMLInputElement).value)
          page.set(0)
        }}
      />
      {() => {
        const list = filtered()
        const pages = Math.max(1, Math.ceil(list.length / pageSize))
        const current = Math.min(page(), pages - 1)
        const visible = list.slice(current * pageSize, (current + 1) * pageSize)
        const order = sort()

        return (
          <div class="gb-data-table-results">
            <div class="gb-table-wrap">
              <table class="gb-table">
                <caption class="gb-table-caption">{caption}</caption>
                <thead class="gb-table-header">
                  <tr class="gb-table-row">
                    {columns.map((column) => (
                      <th
                        scope="col"
                        class="gb-table-head"
                        aria-sort={column.compare === undefined
                          ? undefined
                          : order?.id === column.id
                            ? order.descending ? 'descending' : 'ascending'
                            : 'none'}
                      >
                        {column.compare === undefined
                          ? column.header
                          : (
                            <button
                              type="button"
                              class="gb-data-table-sort"
                              onClick={() => cycle(column.id)}
                            >
                              {column.header}
                              <span aria-hidden="true">
                                {order?.id === column.id ? order.descending ? ' ↓' : ' ↑' : ' ↕'}
                              </span>
                            </button>
                          )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody class="gb-table-body">
                  {visible.length === 0
                    ? (
                      <tr class="gb-table-row">
                        <td colspan={columns.length} class="gb-table-cell">{emptyText}</td>
                      </tr>
                    )
                    : visible.map((row) => (
                      <tr class="gb-table-row">
                        {columns.map((column) => (
                          <td class="gb-table-cell">
                            {column.cell === undefined ? column.text(row) : column.cell(row)}
                          </td>
                        ))}
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <div class="gb-data-table-pagination">
              <p role="status" class="gb-data-table-status">
                {list.length} results · Page {current + 1} of {pages}
              </p>
              <Button
                variant="outline"
                size="sm"
                disabled={current === 0}
                onClick={() => page.set(current - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={current >= pages - 1}
                onClick={() => page.set(current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )
      }}
    </div>
  )
}