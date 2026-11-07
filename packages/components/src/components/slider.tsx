/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'

export interface SliderProps extends BaseProps {
  readonly min?: number | undefined
  readonly max?: number | undefined
  readonly step?: number | undefined
  readonly value?: number | (() => number) | undefined
  readonly defaultValue?: number | undefined
  readonly onValueChange?: ((value: number) => void) | undefined
}

/**
 * A native range input, styled. The filled part of the track follows the value.
 */
export function Slider(props: SliderProps): Child {
  const { min = 0, max = 100, step = 1, value, defaultValue, onValueChange, onInput, class: className, children: _children, ...rest } = props
  const state = createControllable<number>({ value, defaultValue: defaultValue ?? min, onChange: onValueChange })
  const percent = (): number => (max === min ? 0 : Math.round(((state.get() - min) / (max - min)) * 10000) / 100)
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      {...rest}
      class={cn('gb-slider', className)}
      value={state.get}
      style={() => `--gb-fill: ${percent()}%`}
      onInput={(event) => {
        state.set(Number((event.currentTarget as HTMLInputElement).value))
        onInput?.(event)
      }}
    />
  )
}