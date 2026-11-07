/** @jsxImportSource @gambrel/view */
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { bindFormReset } from '../lib/input-state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface FileInputProps extends BaseProps {
  readonly onFilesChange?: ((files: readonly File[]) => void) | undefined
  readonly emptyText?: string | undefined
  readonly showSelection?: boolean | undefined
  readonly ref?: ((element: Element) => void) | undefined
}

/**
 * A native file input. The selection remains browser-owned and is never serialized.
 */
export function FileInput(props: FileInputProps): Child {
  const {
    onFilesChange,
    emptyText = 'No files selected',
    showSelection = true,
    onChange,
    ref,
    class: className,
    children: _children,
    ...rest
  } = props

  if ('value' in rest || 'defaultValue' in rest) throw new TypeError('FileInput cannot be controlled with value or defaultValue')

  const names = signal<readonly string[]>([])

  return (
    <div class="gb-file-input">
      <input
        {...rest}
        type="file"
        class={cn('gb-input', className)}
        ref={(element: Element) => {
          bindFormReset(element, () => names.set([]))
          ref?.(element)
        }}
        onChange={(event) => {
          const input = event.currentTarget as HTMLInputElement
          const files = Array.from(input.files ?? [])
          names.set(files.map((file) => file.name))
          onFilesChange?.(files)
          onChange?.(event)
        }}
      />
      {showSelection ? (
        <p class="gb-file-selection" aria-live="polite">
          {() => names().length === 0 ? emptyText : names().join(', ')}
        </p>
      ) : null}
    </div>
  )
}