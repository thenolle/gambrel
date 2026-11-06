import { createElement } from './element.ts'
import type { Props, VNode, VNodeType } from './types.ts'

export { Fragment } from './element.ts'
export type { JSX } from './jsx-types.ts'

export function jsx(type: VNodeType, props: Props, key?: string | number | undefined): VNode {
  return createElement(type, props, key)
}

export const jsxs = jsx