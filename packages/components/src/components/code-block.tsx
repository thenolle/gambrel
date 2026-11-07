/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'
import { CopyButton } from './copy-button.tsx'

export interface CodeBlockProps extends BaseProps {
  readonly code: string
  readonly language?: string | undefined
  readonly title?: string | undefined
  readonly copyable?: boolean | undefined
}

/**
 * Escaped code presentation with optional copying. Does not interpret or execute code.
 */
export function CodeBlock(props: CodeBlockProps): Child {
  const {
    code,
    language = 'text',
    title,
    copyable = true,
    class: className,
    children: _children,
    ...rest
  } = props

  return (
    <figure {...rest} class={cn('gb-code-block', className)}>
      <figcaption class="gb-code-caption">
        <span class="gb-code-title">{title ?? language}</span>
        <span class="gb-code-language">{language}</span>
        {copyable ? <CopyButton text={code} /> : null}
      </figcaption>
      <pre class="gb-code-pre">
        <code>{code}</code>
      </pre>
    </figure>
  )
}