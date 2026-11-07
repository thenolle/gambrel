import { escapeAttribute } from '@gambrel/view'
import type { IconNode } from './types.ts'

export interface SvgOptions {
  readonly size?: number | string
  readonly color?: string
  readonly strokeWidth?: number | string
}

/**
 * Renders an icon drawing as a standalone SVG string (with `xmlns`), for files, emails or
 * anywhere JSX is not available.
 */
export function renderIconSvg(node: IconNode, options: SvgOptions = {}): string {
  const { size = 24, color = 'currentColor', strokeWidth = 2 } = options
  const shapes = node.map(([tag, attributes]) => {
    const list = Object.entries(attributes).map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`).join('')
    return `<${tag}${list}/>`
  }).join('')
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${escapeAttribute(String(size))}" height="${escapeAttribute(String(size))}" ` +
    `viewBox="0 0 24 24" fill="none" stroke="${escapeAttribute(color)}" stroke-width="${escapeAttribute(String(strokeWidth))}" ` +
    `stroke-linecap="round" stroke-linejoin="round">${shapes}</svg>`
  )
}