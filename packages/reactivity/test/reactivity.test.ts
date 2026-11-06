import { describe, expect, test } from 'bun:test'
import { batch, effect, onCleanup, root, signal, untrack } from '../src/index.ts'

describe('signal', () => {
  test('reads, sets, updates and peeks', () => {
    const count = signal(1)
    count.set(2)
    count.update((n) => n + 3)
    expect(count()).toBe(5)
    expect(count.peek()).toBe(5)
  })

  test('ignores writes of an equal value', () => {
    const count = signal(1)
    let runs = 0
    effect(() => {
      count()
      runs += 1
    })
    count.set(1)
    expect(runs).toBe(1)
  })

  test('supports custom equality', () => {
    const point = signal({ x: 1 }, { equals: (a, b) => a.x === b.x })
    let runs = 0
    effect(() => {
      point()
      runs += 1
    })
    point.set({ x: 1 })
    point.set({ x: 2 })
    expect(runs).toBe(2)
  })
})

describe('effect', () => {
  test('runs immediately and re-runs on change', () => {
    const count = signal(0)
    const seen: number[] = []
    effect(() => {
      seen.push(count())
    })
    count.set(1)
    count.set(2)
    expect(seen).toEqual([0, 1, 2])
  })

  test('drops stale dependencies', () => {
    const useA = signal(true)
    const a = signal('a')
    const b = signal('b')
    const seen: string[] = []
    effect(() => {
      seen.push(useA() ? a() : b())
    })
    b.set('b2')
    expect(seen).toEqual(['a'])
    useA.set(false)
    expect(seen).toEqual(['a', 'b2'])
    a.set('a2')
    expect(seen).toEqual(['a', 'b2'])
  })

  test('runs cleanups in LIFO order before each re-run and on dispose', () => {
    const n = signal(0)
    const log: string[] = []
    const dispose = effect(() => {
      const value = n()
      onCleanup(() => log.push(`onCleanup ${value}`))
      return () => log.push(`returned ${value}`)
    })
    n.set(1)
    expect(log).toEqual(['returned 0', 'onCleanup 0'])
    dispose()
    expect(log).toEqual(['returned 0', 'onCleanup 0', 'returned 1', 'onCleanup 1'])
    n.set(2)
    expect(log.length).toBe(4)
  })

  test('disposes nested effects when the outer effect re-runs', () => {
    const outer = signal(0)
    const inner = signal(0)
    let innerRuns = 0
    effect(() => {
      outer()
      effect(() => {
        inner()
        innerRuns += 1
      })
    })
    expect(innerRuns).toBe(1)
    outer.set(1)
    expect(innerRuns).toBe(2)
    inner.set(1)
    expect(innerRuns).toBe(3)
  })

  test('does not re-run because of its own writes', () => {
    const n = signal(0)
    effect(() => {
      if (n() < 5) n.set(n() + 1)
    })
    expect(n.peek()).toBe(1)
  })

  test('detects effect cycles', () => {
    const a = signal(0)
    const b = signal(0)
    effect(() => {
      b.set(a() + 1)
    })
    expect(() =>
      effect(() => {
        a.set(b() + 1)
      })
    ).toThrow('cycle')
  })

  test('propagates effect errors to the writer', () => {
    const s = signal(0)
    effect(() => {
      if (s() === 1) throw new Error('boom')
    })
    expect(() => s.set(1)).toThrow('boom')
  })
})

describe('batch, untrack and root', () => {
  test('batch runs dependent effects once', () => {
    const a = signal(1)
    const b = signal(2)
    let runs = 0
    effect(() => {
      a()
      b()
      runs += 1
    })
    batch(() => {
      a.set(10)
      b.set(20)
    })
    expect(runs).toBe(2)
  })

  test('untrack reads without subscribing', () => {
    const s = signal(0)
    let runs = 0
    effect(() => {
      untrack(() => s())
      runs += 1
    })
    s.set(1)
    expect(runs).toBe(1)
  })

  test('root disposal stops its effects and runs its cleanups', () => {
    const s = signal(0)
    const log: string[] = []
    let runs = 0
    let stop: () => void = () => {}
    root((dispose) => {
      stop = dispose
      effect(() => {
        s()
        runs += 1
      })
      onCleanup(() => log.push('root cleanup'))
    })
    s.set(1)
    expect(runs).toBe(2)
    stop()
    s.set(2)
    expect(runs).toBe(2)
    expect(log).toEqual(['root cleanup'])
  })

  test('onCleanup outside an owner throws', () => {
    expect(() => onCleanup(() => {})).toThrow('onCleanup()')
  })
})