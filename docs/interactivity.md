# Interactivity

Pages are rendered on the server, then the browser attaches behavior to the HTML it already has. This page shows how to write components that work in both places.

## Signals

A signal holds a value and tells the page when it changes:

```tsx title="src/components/counter.tsx"
/** @jsxImportSource @gambrel/view */
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'

export function Counter(): Child {
  const count = signal(0)
  return (
    <button type="button" onClick={() => count.update((n) => n + 1)}>
      Clicked {count} times
    </button>
  )
}
```

| Call                         | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `count()`                    | Read the value (and subscribe, when used in a reactive spot) |
| `count.set(5)`               | Replace the value                                            |
| `count.update((n) => n + 1)` | Compute the next value                                       |
| `count.peek()`               | Read without subscribing                                     |

## Where reactivity applies

Any **function** placed in a child or attribute position is treated as "re-run me when my signals change":

```tsx
<p>{count}</p>                          // a signal is a function
<p>{() => count() * 2}</p>              // a derived value is a function
<p class={() => (open() ? 'open' : 'closed')}>x</p>
<input value={text} />
```

On the server the function is called once and its value written to the HTML. In the browser it stays live. Calling the signal directly, `{count()}`, reads it once and never updates.

## Events

`onClick`, `onInput`, `onKeyDown`, and so on attach event listeners. The event name is the rest of the prop in lower case. Handlers are never written into the HTML.

```tsx
<input
  value={text}
  onInput={(event) => text.set((event.currentTarget as HTMLInputElement).value)}
/>
```

`currentTarget` is typed `unknown`, so cast it to the element you know it is.

## Showing and hiding

A function child can return different content. The whole region is re-rendered when it changes, and the old content is cleaned up:

```tsx
<div>{() => (open() ? <Panel /> : null)}</div>
<ul>{() => items().map((item) => <li>{item}</li>)}</ul>
```

> [!NOTE]
> Lists are replaced as a whole. There is no keyed diffing yet, so very large, frequently changing lists are not a good fit.

## Keep the first render identical

The browser rebuilds the same tree from the same data and compares it with the server HTML. Anything that differs between the two renders will be reported as a hydration mismatch.

- Do not read `Date.now()`, `Math.random()` or `window` while rendering.
- Compute such values in a loader and pass them down as data, or set them after hydration in an event handler or `ref`.
- Route components must be synchronous.

## Browser-only setup

Use `ref` for anything that needs the real element. It runs only in the browser, after the element and its children exist, and never on the server:

```tsx
<canvas
  ref={(element) => {
    const canvas = element as HTMLCanvasElement
    canvas.getContext('2d')
  }}
/>
```

Inside a `ref` callback you can register cleanup with `onCleanup` from `@gambrel/reactivity`.

> [!WARNING]
> Do not call `effect()` or `onCleanup()` directly in a component body that also renders on the server. The server has no reactive owner there. Put browser-only work in `ref` callbacks or event handlers.

## More tools

| API                         | Use                                    |
| --------------------------- | -------------------------------------- |
| `batch(fn)`                 | Run several writes, then update once.  |
| `untrack(fn)`               | Read signals without subscribing.      |
| `root(fn)`                  | A detached scope you dispose yourself. |
| `signal(value, { equals })` | A custom rule for "has it changed".    |

See [Reactivity](./reactivity.md) and [Browser runtime](./browser.md) for the full references, and [SSR and hydration](./ssr-hydration.md) for how mismatches are repaired.