import type { Child, EventHandler } from '@gambrel/view'

/**
 * Props every component accepts. Anything not listed is passed to the root element.
 */
export interface BaseProps {
  readonly class?: string | undefined
  readonly children?: Child
  readonly onClick?: EventHandler | undefined
  readonly onInput?: EventHandler | undefined
  readonly onChange?: EventHandler | undefined
  readonly onKeyDown?: EventHandler | undefined
  readonly onFocus?: EventHandler | undefined
  readonly onBlur?: EventHandler | undefined
  readonly [attribute: string]: unknown
}