# @gambrel/reactivity

Signals, effects, batching, and ownership for Gambrel interfaces.

## Install

```bash
bun add @gambrel/reactivity
```

## Signals and effects

```ts
import { effect, signal } from '@gambrel/reactivity'

const count = signal(0)

const dispose = effect(() => {
  console.log(count())
})

count.update((value) => value + 1)
dispose()
```

A signal is callable. Read it with `count()`, replace it with `count.set(value)`, or update it with `count.update(fn)`.

`peek()` reads without subscribing.

## API

| Function    | Purpose                                        |
| ----------- | ---------------------------------------------- |
| `signal`    | Store a reactive value                         |
| `effect`    | Track reads and rerun when dependencies change |
| `batch`     | Group writes before effects flush              |
| `untrack`   | Read without collecting dependencies           |
| `root`      | Create a detached ownership scope              |
| `onCleanup` | Register effect or ownership cleanup           |

Effects collect fresh dependencies on every run. Cleanups run before reruns and on disposal.

## JSX accessors

```tsx
<p>{count}</p>
<p>{() => count() * 2}</p>
```

Passing a function keeps the value reactive in the browser. Calling it directly in a component body reads the current value once.

## Ownership

Use the dispose function returned by `effect` or the disposal function supplied by `root` to release long-lived subscriptions.

## Documentation

[Reactivity reference](https://thenolle.github.io/gambrel/#/reactivity)

## License

PolyForm Strict License 1.0.0. See LICENSE for permitted uses and restrictions.