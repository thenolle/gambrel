/** @jsxImportSource @gambrel/view */
import type { Child, ViewEvent } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createPart } from '../lib/part.ts'
import type { BaseProps } from '../lib/types.ts'

export const Avatar = createPart('span', 'gb-avatar')
export const AvatarFallback = createPart('span', 'gb-avatar-fallback')

export interface AvatarImageProps extends BaseProps {
  readonly src: string
  readonly alt?: string | undefined
}

function hideBroken(event: ViewEvent): void {
  const image = event.currentTarget as HTMLElement | null
  if (image !== null) image.hidden = true
}

/**
 * The image sits on top of the fallback. If it fails to load it hides itself and the
 * fallback shows through. Images that fail before the page is interactive are not caught.
 */
export function AvatarImage(props: AvatarImageProps): Child {
  const { class: className, children: _children, alt = '', ...rest } = props
  return <img alt={alt} {...rest} class={cn('gb-avatar-image', className)} onError={hideBroken} />
}