/** @jsxImportSource @gambrel/view */
import { Minus, Plus } from '@gambrel/icons'
import { effect, signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { bindFormReset, createInputState } from '../lib/input-state.ts'
import { clampNumber, parseNumberDraft, stepNumber, validateNumberBounds } from '../lib/number.ts'
import type { BaseProps } from '../lib/types.ts'
import { InputGroup, InputGroupButton } from './input-group.tsx'

export interface NumberInputProps extends BaseProps {
  readonly value?: number | null | (() => number | null) | undefined
  readonly defaultValue?: number | null | undefined
  readonly onValueChange?: ((value: number | null) => void) | undefined
  readonly min?: number | undefined
  readonly max?: number | undefined
  readonly step?: number | undefined
  readonly disabled?: boolean | undefined
  readonly readOnly?: boolean | undefined
  readonly decrementLabel?: string | undefined
  readonly incrementLabel?: string | undefined
  readonly ref?: ((element: Element) => void) | undefined
}

function format(value: number | null): string {
  if (value === null) return ''
  if (!Number.isFinite(value)) throw new TypeError('NumberInput value must be finite or null')
  return String(value)
}

/**
 * An editable numeric field with increment/decrement controls.
 * Empty drafts report null. Invalid drafts are corrected on blur.
 */
export function NumberInput(props: NumberInputProps): Child {
  const {
    value,
    defaultValue = null,
    onValueChange,
    min,
    max,
    step = 1,
    disabled = false,
    readOnly = false,
    decrementLabel = 'Decrease value',
    incrementLabel = 'Increase value',
    onInput,
    onBlur,
    ref,
    class: className,
    children: _children,
    ...rest
  } = props
  const bounds = { min, max, step }
  validateNumberBounds(bounds)

  const state = createInputState<number | null>({
    value,
    defaultValue,
    onChange: onValueChange
  })
  const draft = signal(format(state.get()))
  let input: HTMLInputElement | undefined

  const write = (): void => {
    draft.set(format(state.get()))
    if (input !== undefined) input.value = draft()
  }

  const adjust = (direction: -1 | 1): void => {
    if (disabled || readOnly) return
    state.set(stepNumber(parseNumberDraft(draft()), direction, bounds))
    write()
  }

  return (
    <InputGroup class="gb-number-input">
      <InputGroupButton
        disabled={disabled || readOnly}
        aria-label={decrementLabel}
        onClick={() => adjust(-1)}
      >
        <Minus size={16} />
      </InputGroupButton>
      <input
        {...rest}
        type="number"
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        readonly={readOnly}
        class={cn('gb-input', className)}
        value={draft}
        ref={(element: Element) => {
          input = element as HTMLInputElement
          const current = input
          effect(() => {
            draft.set(format(state.get()))
          })
          bindFormReset(current, () => {
            state.reset()
            write()
          })
          ref?.(element)
        }}
        onInput={(event) => {
          const target = event.currentTarget as HTMLInputElement
          draft.set(target.value)
          const parsed = parseNumberDraft(target.value)
          if (target.value.trim() === '' || parsed !== null) state.set(parsed)
          onInput?.(event)
          if (value !== undefined) write()
        }}
        onBlur={(event) => {
          const parsed = parseNumberDraft(draft())
          state.set(parsed === null ? null : clampNumber(parsed, bounds))
          write()
          onBlur?.(event)
        }}
      />
      <InputGroupButton
        disabled={disabled || readOnly}
        aria-label={incrementLabel}
        onClick={() => adjust(1)}
      >
        <Plus size={16} />
      </InputGroupButton>
    </InputGroup>
  )
}