import { describe, expect, test } from 'bun:test'
import { signal } from '@gambrel/reactivity'
import { cn, createControllable, variants } from '../src/index.ts'

describe('cn', () => {
  test('joins, flattens, skips falsy values and removes repeats', () => {
    expect(cn('a', false, null, undefined, '', ['b', { c: true, d: false }], 'a  e')).toBe('a b c e')
  })
})

describe('variants', () => {
  const tone = variants({
    base: 'x',
    variants: { tone: { a: 'tone-a', b: 'tone-b' }, size: { s: 'size-s', l: 'size-l' } },
    defaultVariants: { tone: 'a', size: 's' }
  })

  test('applies defaults, choices and a trailing class', () => {
    expect(tone()).toBe('x tone-a size-s')
    expect(tone({ tone: 'b', class: 'extra' })).toBe('x tone-b size-s extra')
    expect(tone({ size: undefined })).toBe('x tone-a size-s')
  })
})

describe('createControllable', () => {
  test('uncontrolled state stores and reports changes', () => {
    const seen: number[] = []
    const state = createControllable({ defaultValue: 1, onChange: (value) => void seen.push(value) })
    state.set(2)
    expect(state.get()).toBe(2)
    expect(seen).toEqual([2])
  })

  test('a fixed value is controlled: set only reports', () => {
    const seen: string[] = []
    const state = createControllable({ value: 'a', defaultValue: 'z', onChange: (value) => void seen.push(value) })
    state.set('b')
    expect(state.get()).toBe('a')
    expect(seen).toEqual(['b'])
  })

  test('an accessor value follows a signal', () => {
    const source = signal(false)
    const state = createControllable({ value: source, defaultValue: false })
    expect(state.get()).toBe(false)
    source.set(true)
    expect(state.get()).toBe(true)
  })
})