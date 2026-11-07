import { createElement, type Props } from '@gambrel/view'
import type { IconComponent, IconNode } from './types.ts'

/**
 * Creates an icon component from a drawing. Generated icons use this; you can also call it
 * yourself for an icon that does not live in the library.
 *
 * Icons are decorative by default (`aria-hidden`). Pass `title` or `aria-label` to give one an accessible name.
 */
export function createIcon(name: string, node: IconNode): IconComponent {
  return (props = {}) => {
    const { size = 24, color = 'currentColor', strokeWidth = 2, class: className, title, children: _children, ...rest } = props
    const labelled = title !== undefined || rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined
    const base = `gb-icon gb-icon-${name}`
    const attributes: Record<string, unknown> = {
      width: size,
      height: size,
      viewBox: '0 0 24 24',
      fill: 'none',
      stroke: color,
      'stroke-width': strokeWidth,
      'stroke-linecap': 'round',
      'stroke-linejoin': 'round',
      class: className === undefined ? base : `${base} ${className}`,
      ...(labelled ? { role: 'img' } : { 'aria-hidden': 'true' }),
      ...rest,
      children: [
        ...(title === undefined ? [] : [createElement('title', { children: title })]),
        ...node.map(([tag, shape]) => createElement(tag, shape))
      ]
    }
    return createElement('svg', attributes as Props)
  }
}