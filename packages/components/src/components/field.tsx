/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn, type ClassValue } from '../lib/cn.ts'
import { createPart } from '../lib/part.ts'
import type { BaseProps } from '../lib/types.ts'

export interface FieldControlProps {
  readonly id: string
  readonly required: boolean | undefined
  readonly 'aria-describedby': string | undefined
  readonly 'aria-invalid': 'true' | undefined
}

export interface FieldProps extends Omit<BaseProps, 'children'> {
  readonly id: string
  readonly label: Child
  readonly description?: Child
  readonly error?: Child
  readonly required?: boolean | undefined
  readonly orientation?: 'vertical' | 'horizontal' | undefined
  readonly children: (props: FieldControlProps) => Child
}

/**
 * Links one control to its label, description and validation error.
 * The child callback must spread its props onto the actual form control.
 */
export function Field(props: FieldProps): Child {
  const { id, label, description, error, required = false, orientation = 'vertical', children, class: className, ...rest } = props
  if (id.trim() === '') throw new TypeError('Field requires a non-empty id')
  const hasDescription = description !== undefined && description !== null
  const hasError = error !== undefined && error !== null && error !== false
  const describedBy = [hasDescription ? `${id}-description` : undefined, hasError ? `${id}-error` : undefined].filter((value): value is string => value !== undefined).join(' ')
  return (
    <div
      {...rest}
      class={cn('gb-field', `gb-field-${orientation}`, className as ClassValue)}
      data-invalid={hasError ? 'true' : undefined}
    >
      <label for={id} class="gb-field-label">
        {label}
        {required ? <span aria-hidden="true" class="gb-field-required"> *</span> : null}
      </label>
      <div class="gb-field-body">
        {children({
          id,
          required: required ? true : undefined,
          'aria-describedby': describedBy === '' ? undefined : describedBy,
          'aria-invalid': hasError ? 'true' : undefined
        })}
        {hasDescription ? (
          <p id={`${id}-description`} class="gb-field-description">{description}</p>
        ) : null}
        {hasError ? (
          <p id={`${id}-error`} class="gb-field-error">{error}</p>
        ) : null}
      </div>
    </div>
  )
}

export const FieldLabel = createPart('label', 'gb-field-label')
export const FieldDescription = createPart('p', 'gb-field-description')
export const FieldError = createPart('p', 'gb-field-error')
export const FieldGroup = createPart('div', 'gb-field-group')