/** @jsxImportSource @gambrel/view */
import { ChevronRight } from '@gambrel/icons'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createPart } from '../lib/part.ts'
import type { BaseProps } from '../lib/types.ts'

export function Breadcrumb(props: BaseProps): Child {
  const { class: className, children, ...rest } = props
  return (
    <nav aria-label="breadcrumb" {...rest} class={cn('gb-breadcrumb', className)}>
      {children}
    </nav>
  )
}

export const BreadcrumbList = createPart('ol', 'gb-breadcrumb-list')
export const BreadcrumbItem = createPart('li', 'gb-breadcrumb-item')
export const BreadcrumbLink = createPart('a', 'gb-breadcrumb-link')

/**
 * The current page: not a link, but announced as the current location.
 */
export function BreadcrumbPage(props: BaseProps): Child {
  const { class: className, children, ...rest } = props
  return (
    <span role="link" aria-disabled="true" aria-current="page" {...rest} class={cn('gb-breadcrumb-page', className)}>
      {children}
    </span>
  )
}

export function BreadcrumbSeparator(props: BaseProps): Child {
  const { class: className, children, ...rest } = props
  return (
    <li role="presentation" aria-hidden="true" {...rest} class={cn('gb-breadcrumb-separator', className)}>
      {children === undefined ? <ChevronRight size={14} /> : children}
    </li>
  )
}