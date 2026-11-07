/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface AspectRatioProps extends BaseProps {
  /**
   * Width divided by height, for example `16 / 9`. Default 1.
   */
  readonly ratio?: number | undefined
  readonly style?: string | undefined
}

export function AspectRatio(props: AspectRatioProps): Child {
  const { ratio = 1, style, class: className, children, ...rest } = props
  return (
    <div {...rest} class={cn('gb-aspect', className)} style={`aspect-ratio: ${ratio}${style === undefined ? '' : `; ${style}`}`}>
      {children}
    </div>
  )
}