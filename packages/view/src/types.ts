/**
 * Minimal structural event type. `@gambrel/view` has no DOM dependency, so handlers
 * are typed against this shape. DOM events satisfy it at runtime.
 */
export interface ViewEvent {
  readonly type: string
  readonly target: unknown
  readonly currentTarget: unknown
  preventDefault(): void
  stopPropagation(): void
}

export type EventHandler = (event: ViewEvent) => void

/**
 * A value, or a zero-argument accessor that produces it. Accessors are called once
 * by the server renderer and tracked by the browser runtime.
 */
export type Reactive<T> = T | (() => T)

export interface Props {
  readonly children?: Child
  readonly [name: string]: unknown
}

export type Component<P = Props> = (props: P) => Child | Promise<Child>

export type AnyComponent = (props: never) => Child | Promise<Child>

export type VNodeType = string | AnyComponent

export interface VNode {
  readonly $$kind: 'vnode'
  readonly type: VNodeType
  readonly props: Props
  readonly key: string | number | undefined
}

/**
 * Trusted HTML that is written to the output without escaping. Create with `raw()`.
 */
export interface RawHtml {
  readonly $$kind: 'raw'
  readonly html: string
}

export type Child =
  | VNode
  | RawHtml
  | string
  | number
  | boolean
  | null
  | undefined
  | readonly Child[]
  | (() => Child)