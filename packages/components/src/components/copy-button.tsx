/** @jsxImportSource @gambrel/view */
import { onCleanup, signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'
import { Button } from './button.tsx'

export interface CopyButtonProps extends BaseProps {
  readonly text: string | (() => string)
  readonly label?: string | undefined
  readonly copiedLabel?: string | undefined
  readonly errorLabel?: string | undefined
  readonly disabled?: boolean | undefined
  readonly onCopied?: (() => void) | undefined
  readonly onCopyError?: ((error: unknown) => void) | undefined
}

/**
 * Copies text after an explicit user action. Requires the browser Clipboard API.
 */
export function CopyButton(props: CopyButtonProps): Child {
  const {
    text,
    label = 'Copy',
    copiedLabel = 'Copied',
    errorLabel = 'Copy failed',
    disabled = false,
    onCopied,
    onCopyError,
    class: className,
    children: _children,
    onClick,
    ...rest
  } = props
  const state = signal<'idle' | 'pending' | 'copied' | 'error'>('idle')
  let element: HTMLButtonElement | undefined
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined

  const copy = async (): Promise<void> => {
    if (disabled || state() === 'pending') return
    clearTimeout(timer)
    state.set('pending')

    try {
      const clipboard = element?.ownerDocument.defaultView?.navigator.clipboard
      if (clipboard === undefined || typeof clipboard.writeText !== 'function') {
        throw new Error('Clipboard access is unavailable')
      }

      await clipboard.writeText(typeof text === 'function' ? text() : text)
      if (disposed) return
      state.set('copied')
      onCopied?.()
    } catch (error) {
      if (disposed) return
      state.set('error')
      onCopyError?.(error)
    } finally {
      if (!disposed) {
        timer = setTimeout(() => state.set('idle'), 2000)
      }
    }
  }

  return (
    <span class="gb-copy-control">
      <Button
        {...rest}
        variant="outline"
        size="sm"
        class={cn('gb-copy-button', className)}
        disabled={() => disabled || state() === 'pending'}
        ref={(node: Element) => {
          element = node as HTMLButtonElement
          onCleanup(() => {
            disposed = true
            clearTimeout(timer)
          })
        }}
        onClick={(event) => {
          onClick?.(event)
          void copy()
        }}
      >
        {() => state() === 'copied'
          ? copiedLabel
          : state() === 'error'
            ? errorLabel
            : label}
      </Button>
      <span class="gb-visually-hidden" role="status">
        {() => state() === 'copied'
          ? copiedLabel
          : state() === 'error'
            ? errorLabel
            : ''}
      </span>
    </span>
  )
}