import { createElement } from './element.ts'
import type { Props, VNode, VNodeType } from './types.ts'

export { Fragment } from './element.ts'
export type { JSX } from './jsx-types.ts'

export function jsxDEV(type: VNodeType, props: Props, key?: string | number | undefined, _isStatic?: boolean, _source?: unknown, _self?: unknown): VNode {
  return createElement(type, props, key)
}