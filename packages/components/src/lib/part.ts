import { createElement, type Child } from '@gambrel/view'
import { cn } from './cn.ts'
import type { BaseProps } from './types.ts'

/**
 * Creates a component that renders `tag` with a base class. Extra classes, children and
 * attributes pass through. Use it for simple structural pieces, like a card header.
 */
export function createPart(tag: string, className: string): (props: BaseProps) => Child {
  return (props) => {
    const { class: extra, children, ...rest } = props
    return createElement(tag, { ...rest, class: cn(className, extra), children })
  }
}