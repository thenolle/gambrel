/** @jsxImportSource @gambrel/view */
import { Eye, EyeOff } from '@gambrel/icons'
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'
import { InputGroup, InputGroupButton } from './input-group.tsx'

export interface PasswordInputProps extends BaseProps {
  readonly disabled?: boolean | undefined
  readonly showLabel?: string | undefined
  readonly hideLabel?: string | undefined
}

/**
 * A native password field with an explicit visibility toggle.
 * Pass the input's value, name, autocomplete and event handlers normally.
 */
export function PasswordInput(props: PasswordInputProps): Child {
  const {
    class: className,
    children: _children,
    disabled = false,
    showLabel = 'Show password',
    hideLabel = 'Hide password',
    ...rest
  } = props
  const visible = signal(false)

  return (
    <InputGroup class="gb-password-input">
      <input
        {...rest}
        type={() => visible() ? 'text' : 'password'}
        disabled={disabled}
        class={cn('gb-input', className)}
      />
      <InputGroupButton
        disabled={disabled}
        aria-label={() => visible() ? hideLabel : showLabel}
        aria-pressed={() => String(visible())}
        onClick={() => visible.set(!visible())}
      >
        {() => visible() ? <EyeOff size={16} /> : <Eye size={16} />}
      </InputGroupButton>
    </InputGroup>
  )
}