# @gambrel/reactivity

| API                            | Behaviour                                                                                                                       |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `signal(initial, { equals? })` | Callable value. `s()` reads and tracks, `s.set(v)`, `s.update(fn)`, `s.peek()`. Equal writes (default `Object.is`) are ignored. |
| `effect(fn)`                   | Runs now and when tracked signals change. May return a cleanup. Returns a dispose function.                                     |
| `batch(fn)`                    | Effects run once after the outermost batch.                                                                                     |
| `untrack(fn)`                  | Reads inside do not subscribe.                                                                                                  |
| `root(fn)`                     | Detached ownership scope. `fn` receives `dispose`.                                                                              |
| `onCleanup(fn)`                | Registers a cleanup on the current effect or root. Throws outside one.                                                          |

## Rules

- Dependencies are re-tracked on every run, so stale subscriptions are dropped.
- Before a re-run, an effect disposes the effects it created, then runs its cleanups in LIFO order.
- Effects created with no owner live until their dispose function is called.
- Writes inside an effect are queued and flushed after the outermost running effect finishes. Effects never run nested.
- An effect does not re-run because of its own writes (including writes by effects it creates).
- A flush aborts with an `Effect cycle detected` error after 10,000 effect runs.
- Errors are rethrown to the writer: one error as is, several as an `AggregateError`.
- No `computed`: derive with plain functions, `() => count() * 2`.