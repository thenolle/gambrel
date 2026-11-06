import type { Child, Props, RawHtml, VNode, VNodeType } from './types.ts'

/**
 * Creates a VNode. This is the single element factory used by the JSX runtime.
 */
export function createElement(
  type: VNodeType,
  props: Props,
  key?: string | number | undefined
): VNode {
  return { $$kind: 'vnode', type, props, key }
}

/**
 * Groups children without a wrapper element.
 */
export function Fragment(props: Props): Child {
  return props.children
}

/**
 * Marks a string as trusted HTML. The string is emitted verbatim: never pass user input.
 */
export function raw(html: string): RawHtml {
  return { $$kind: 'raw', html }
}

function hasKind(value: unknown, kind: string): boolean {
  return typeof value === 'object' && value !== null && '$$kind' in value && value.$$kind === kind
}

export function isVNode(value: unknown): value is VNode {
  return hasKind(value, 'vnode')
}

export function isRawHtml(value: unknown): value is RawHtml {
  return hasKind(value, 'raw')
}