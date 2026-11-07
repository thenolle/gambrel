import type { VNode } from '@gambrel/view'

/**
 * The drawing of an icon: a list of `[tag, attributes]` pairs on a 24 by 24 grid.
 */
export type IconNode = readonly (readonly [tag: string, attributes: Readonly<Record<string, string>>])[]

export interface IconProps {
  /**
   * Width and height in pixels or any CSS length. Default 24.
   */
  readonly size?: number | string
  /**
   * Stroke color. Default `currentColor`, so icons follow the text color.
   */
  readonly color?: string
  /**
   * Stroke width on the 24 by 24 grid. Default 2.
   */
  readonly strokeWidth?: number | string
  /**
   * Extra class names, added after the built-in `gb-icon gb-icon-<name>`.
   */
  readonly class?: string
  /**
   * An accessible name. Without `title` or an `aria-label`, the icon is hidden from assistive technology.
   */
  readonly title?: string
  readonly [attribute: string]: unknown
}

export type IconComponent = (props?: IconProps) => VNode