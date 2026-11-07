/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createPart } from '../lib/part.ts'
import type { BaseProps } from '../lib/types.ts'

export function NavigationMenu(props: BaseProps): Child {
  const { class: className, children, ...rest } = props
  return (
    <nav aria-label="Main navigation" {...rest} class={cn('gb-navigation', className)}>
      {children}
    </nav>
  )
}

export const NavigationList = createPart('ul', 'gb-navigation-list')
export const NavigationItem = createPart('li', 'gb-navigation-item')
export const NavigationLink = createPart('a', 'gb-navigation-link')

export const Sidebar = createPart('aside', 'gb-sidebar')
export const SidebarHeader = createPart('div', 'gb-sidebar-header')
export const SidebarContent = createPart('div', 'gb-sidebar-content')
export const SidebarFooter = createPart('div', 'gb-sidebar-footer')
export const SidebarGroup = createPart('section', 'gb-sidebar-group')
export const SidebarGroupLabel = createPart('h2', 'gb-sidebar-group-label')
export const SidebarLink = createPart('a', 'gb-sidebar-link')

/**
 * A structural action bar. Children retain their ordinary native tab order.
 */
export const Toolbar = createPart('div', 'gb-toolbar')
export const ToolbarGroup = createPart('div', 'gb-toolbar-group')

export interface EmptyStateProps extends BaseProps {
  readonly title: string
  readonly description?: Child
  readonly icon?: Child
  readonly action?: Child
}

export function EmptyState(props: EmptyStateProps): Child {
  const {
    title,
    description,
    icon,
    action,
    class: className,
    children,
    ...rest
  } = props
  return (
    <section {...rest} class={cn('gb-empty-state', className)}>
      {icon === undefined ? null : <div class="gb-empty-icon">{icon}</div>}
      <h3 class="gb-empty-title">{title}</h3>
      {description === undefined ? null : <p class="gb-empty-description">{description}</p>}
      {children}
      {action === undefined ? null : <div class="gb-empty-action">{action}</div>}
    </section>
  )
}

export interface StatCardProps extends BaseProps {
  readonly label: string
  readonly value: Child
  readonly detail?: Child
}

export function StatCard(props: StatCardProps): Child {
  const { label, value, detail, class: className, children: _children, ...rest } = props
  return (
    <div {...rest} class={cn('gb-stat-card', className)}>
      <p class="gb-stat-label">{label}</p>
      <p class="gb-stat-value">{value}</p>
      {detail === undefined ? null : <p class="gb-stat-detail">{detail}</p>}
    </div>
  )
}

export interface DescriptionItem {
  readonly term: string
  readonly description: Child
}

export interface DescriptionListProps extends BaseProps {
  readonly items: readonly DescriptionItem[]
}

export function DescriptionList(props: DescriptionListProps): Child {
  const { items, class: className, children: _children, ...rest } = props
  return (
    <dl {...rest} class={cn('gb-description-list', className)}>
      {items.map((item) => (
        <div class="gb-description-item">
          <dt>{item.term}</dt>
          <dd>{item.description}</dd>
        </div>
      ))}
    </dl>
  )
}