import { onCleanup, untrack } from '@gambrel/reactivity'
import { createControllable } from './state.ts'

export interface InputStateOptions<T> {
  readonly value?: T | (() => T) | undefined
  readonly defaultValue: T
  readonly onChange?: ((value: T) => void) | undefined
}

/**
 * Input-specific state with a silent uncontrolled reset.
 */
export function createInputState<T>(options: InputStateOptions<T>) {
  const state = createControllable<T>({
    value: options.value,
    defaultValue: options.defaultValue
  })
  return {
    get: state.get,
    set(next: T): void {
      const previous = untrack(state.get)
      if (Object.is(previous, next)) return
      state.set(next)
      options.onChange?.(next)
    },
    reset(): void {
      if (options.value === undefined) state.set(options.defaultValue)
    }
  }
}

/**
 * Restores enhanced input state after the browser completes a native form reset.
 * Disposal removes the listener and invalidates queued work.
 */
export function bindFormReset(element: Element, reset: () => void): void {
  const form = element.closest('form')
  if (form === null) return
  let disposed = false
  const listener = (event: Event): void => {
    queueMicrotask(() => {
      if (!disposed && !event.defaultPrevented) reset()
    })
  }
  form.addEventListener('reset', listener)
  onCleanup(() => {
    disposed = true
    form.removeEventListener('reset', listener)
  })
}