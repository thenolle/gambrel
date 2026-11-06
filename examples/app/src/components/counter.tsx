/** @jsxImportSource @gambrel/view */
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'

export interface CounterProps {
  readonly initial?: number
}

export function Counter(props: CounterProps): Child {
  const count = signal(props.initial ?? 0)
  return (
    <button type="button" onClick={() => count.update((n) => n + 1)}>
      Clicked {count} times
    </button>
  )
}