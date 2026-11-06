# @gambrel/reactivity

Signals, effects and ownership: the smallest reactive core that the browser runtime and your components need. It has no dependencies.

```ts
import { batch, effect, onCleanup, root, signal, untrack } from '@gambrel/reactivity'
```

## signal

```ts
const count = signal(0)
count()                       // 0, and subscribes the running effect
count.set(5)                  // replace the value
count.update((n) => n + 1)    // compute the next value
count.peek()                  // read without subscribing
```

A signal is a function, so it also works as an accessor in JSX: `<p>{count}</p>`.

```ts
signal(initial, { equals?: (previous, next) => boolean })
```

Writes that are equal to the current value (default `Object.is`) are ignored. Pass `equals` for custom rules.

## effect

```ts
const dispose = effect(() => {
  console.log(count())
  return () => console.log('cleaning up') // optional
})
```

| Behavior       | Detail                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| First run      | Immediately                                                                                   |
| Re-run         | When a signal it read changes                                                                 |
| Dependencies   | Re-collected on every run, so stale subscriptions are dropped                                 |
| Cleanup        | The returned function and any `onCleanup` run before each re-run and on dispose, newest first |
| Nested effects | Owned by the outer effect and disposed before it re-runs                                      |
| Return value   | A function that disposes the effect                                                           |

## batch, untrack, root

```ts
batch(() => {              // effects run once, after the batch
  a.set(1)
  b.set(2)
})

untrack(() => count())      // read without subscribing

root((dispose) => {         // a detached scope
  effect(() => { /* ... */ })
  onCleanup(() => { /* ... */ })
  return dispose            // call later to release everything
})
```

## onCleanup

```ts
onCleanup(() => clearInterval(id))
```

Registers a cleanup on the current effect or root. Outside of one it throws `onCleanup() must be called inside an effect or root()`. Effects created with no owner live until you call the function `effect()` returned.

## Timing rules

- Writes made inside an effect are queued and applied after the **outermost** running effect finishes, so effects never run nested.
- An effect does not re-run because of its own writes.
- If effects keep re-triggering each other, the flush stops after 10,000 runs with `Effect cycle detected`.
- Errors thrown by an effect reach the code that wrote the signal. One error is rethrown as it is, several become an `AggregateError`. Nothing is swallowed.

## Not included

There is no `computed`. Derive values with plain functions: `() => count() * 2`. This keeps the graph small, and it works anywhere a reactive accessor is accepted.