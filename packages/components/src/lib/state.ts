import { signal, untrack } from '@gambrel/reactivity'

export interface ControllableOptions<T> {
  /**
   * A fixed value, or an accessor such as a signal, to control the state from outside.
   * Leave it out to let the component keep the state itself.
   */
  readonly value?: T | (() => T) | undefined
  readonly defaultValue: T
  readonly onChange?: ((value: T) => void) | undefined
}

/**
 * State that works controlled or uncontrolled. `T` must not be a function type.
 * Controlled: `set` only reports through `onChange`. Uncontrolled: `set` also stores the value.
 * Setting the value the state already has does nothing and reports nothing.
 */
export function createControllable<T>(options: ControllableOptions<T>): { get: () => T; set: (value: T) => void } {
  const inner = signal(options.defaultValue)
  const get = (): T => {
    const controlled = options.value
    if (controlled === undefined) return inner()
    return typeof controlled === 'function' ? (controlled as () => T)() : controlled
  }
  return {
    get,
    set: (next) => {
      if (Object.is(next, untrack(get))) return
      if (options.value === undefined) inner.set(next)
      options.onChange?.(next)
    }
  }
}