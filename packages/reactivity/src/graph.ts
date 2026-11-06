interface Owner {
  readonly cleanups: Array<() => void>
  readonly children: Set<Effect>
  disposed: boolean
}

interface Effect extends Owner {
  readonly run: () => void | (() => void)
  readonly sources: Set<Set<Effect>>
  readonly parent: Owner | undefined
  running: boolean
  queued: boolean
}

const MAX_RUNS_PER_FLUSH = 10_000

let currentOwner: Owner | undefined
let currentEffect: Effect | undefined
let runDepth = 0
let batchDepth = 0
let flushing = false
const queue: Effect[] = []

function throwCollected(errors: unknown[]): void {
  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) throw new AggregateError(errors, 'Multiple errors occurred while running effects')
}

function unsubscribe(effect: Effect): void {
  for (const source of effect.sources) source.delete(effect)
  effect.sources.clear()
}

function runCleanups(owner: Owner): void {
  const errors: unknown[] = []
  for (const child of [...owner.children]) {
    try {
      disposeEffect(child)
    } catch (error) {
      errors.push(error)
    }
  }
  owner.children.clear()
  for (const cleanup of owner.cleanups.splice(0).reverse()) {
    try {
      untrack(cleanup)
    } catch (error) {
      errors.push(error)
    }
  }
  throwCollected(errors)
}

function disposeEffect(effect: Effect): void {
  if (effect.disposed) return
  effect.disposed = true
  unsubscribe(effect)
  effect.parent?.children.delete(effect)
  runCleanups(effect)
}

function runEffect(effect: Effect): void {
  if (effect.disposed) return
  unsubscribe(effect)
  runCleanups(effect)
  const previousOwner = currentOwner
  const previousEffect = currentEffect
  currentOwner = effect
  currentEffect = effect
  effect.running = true
  runDepth += 1
  try {
    const cleanup = effect.run()
    if (typeof cleanup === 'function') effect.cleanups.push(cleanup)
  } finally {
    runDepth -= 1
    effect.running = false
    currentOwner = previousOwner
    currentEffect = previousEffect
  }
  if (effect.disposed) runCleanups(effect)
}

function schedule(effect: Effect): void {
  if (effect.disposed || effect.running || effect.queued) return
  effect.queued = true
  queue.push(effect)
}

function flush(): void {
  flushing = true
  const errors: unknown[] = []
  let runs = 0
  try {
    for (let effect = queue.shift(); effect !== undefined; effect = queue.shift()) {
      effect.queued = false
      if (effect.disposed) continue
      runs += 1
      if (runs > MAX_RUNS_PER_FLUSH) {
        for (const pending of queue) pending.queued = false
        queue.length = 0
        errors.push(new Error(`Effect cycle detected: more than ${MAX_RUNS_PER_FLUSH} effect runs in one flush`))
        break
      }
      try {
        runEffect(effect)
      } catch (error) {
        errors.push(error)
      }
    }
  } finally {
    flushing = false
  }
  throwCollected(errors)
}

function settle(): void {
  if (runDepth === 0 && batchDepth === 0 && !flushing && queue.length > 0) flush()
}

export interface Signal<T> {
  (): T
  set(value: T): void
  update(updater: (current: T) => T): void
  peek(): T
}

export interface SignalOptions<T> {
  /**
   * Decides whether a write changes the value. Defaults to `Object.is`.
   */
  readonly equals?: (previous: T, next: T) => boolean
}

/**
 * Creates a reactive value. Calling the signal reads it and, inside an effect,
 * subscribes the effect to it.
 */
export function signal<T>(initial: T, options: SignalOptions<T> = {}): Signal<T> {
  const equals = options.equals ?? Object.is
  const observers = new Set<Effect>()
  let value = initial
  const read = (): T => {
    if (currentEffect !== undefined) {
      observers.add(currentEffect)
      currentEffect.sources.add(observers)
    }
    return value
  }
  const set = (next: T): void => {
    if (equals(value, next)) return
    value = next
    for (const observer of [...observers]) schedule(observer)
    settle()
  }
  const update = (updater: (current: T) => T): void => set(updater(value))
  const peek = (): T => value
  return Object.assign(read, { set, update, peek })
}

/**
 * Runs `run` now and again whenever a signal it read changes. The function may
 * return a cleanup. Returns a function that disposes the effect.
 */
export function effect(run: () => void | (() => void)): () => void {
  const created: Effect = { run, cleanups: [], children: new Set(), sources: new Set(), parent: currentOwner, disposed: false, running: false, queued: false }
  currentOwner?.children.add(created)
  try {
    runEffect(created)
  } catch (error) {
    disposeEffect(created)
    throw error
  }
  settle()
  return () => disposeEffect(created)
}

/**
 * Groups writes so effects run once, after the outermost batch completes.
 */
export function batch<T>(fn: () => T): T {
  batchDepth += 1
  try {
    return fn()
  } finally {
    batchDepth -= 1
    settle()
  }
}

/**
 * Runs `fn` without subscribing the current effect to the signals it reads.
 */
export function untrack<T>(fn: () => T): T {
  const previous = currentEffect
  currentEffect = undefined
  try {
    return fn()
  } finally {
    currentEffect = previous
  }
}

/**
 * Creates a detached ownership scope. Effects and cleanups created inside belong to
 * it until `dispose` is called. Call `dispose` (or hand it to `onCleanup`) to release them.
 */
export function root<T>(fn: (dispose: () => void) => T): T {
  const owner: Owner = { cleanups: [], children: new Set(), disposed: false }
  const dispose = (): void => {
    if (owner.disposed) return
    owner.disposed = true
    runCleanups(owner)
  }
  const previousOwner = currentOwner
  const previousEffect = currentEffect
  currentOwner = owner
  currentEffect = undefined
  try {
    return fn(dispose)
  } finally {
    currentOwner = previousOwner
    currentEffect = previousEffect
  }
}

/**
 * Registers a cleanup on the current effect or root. Throws outside of one.
 */
export function onCleanup(cleanup: () => void): void {
  if (currentOwner === undefined) throw new Error('onCleanup() must be called inside an effect or root()')
  currentOwner.cleanups.push(cleanup)
}