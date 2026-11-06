import type { Child, EventHandler, Reactive, VNode } from './types.ts'

export interface HtmlProps {
  readonly children?: Child
  readonly class?: Reactive<string | null | undefined>
  readonly id?: Reactive<string | null | undefined>
  readonly style?: Reactive<string | null | undefined>
  readonly [event: `on${string}`]: EventHandler | undefined
  readonly [attribute: string]: unknown
}

export declare namespace JSX {
  export type Element = VNode
  export type ElementType = string | ((props: never) => Child | Promise<Child>)
  export interface ElementChildrenAttribute {
    children: unknown
  }
  export interface IntrinsicAttributes {
    key?: string | number | undefined
  }
  export interface IntrinsicElements {
    [tag: string]: HtmlProps
  }
}