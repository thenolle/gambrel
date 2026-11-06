import { describe, expect, test } from 'bun:test'
import { assertJsonValue, isJsonValue } from '../src/index.ts'

describe('assertJsonValue', () => {
  test('accepts plain JSON', () => {
    const good = [null, true, 'a', 1.5, [], {}, { a: [1, { b: null }] }, Object.create(null)]
    for (const value of good) expect(isJsonValue(value)).toBe(true)
  })

  test('rejects values JSON cannot represent', () => {
    const circular: Record<string, unknown> = {}
    circular['self'] = circular
    const bad = [
      undefined,
      () => 1,
      Symbol('s'),
      10n,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      new Date(),
      new Map(),
      new (class Thing { })(),
      [1, undefined],
      { a: undefined },
      circular,
      [1, , 3]
    ]
    for (const value of bad) expect(isJsonValue(value)).toBe(false)
  })

  test('names the offending path', () => {
    expect(() => assertJsonValue({ a: [1, { b: undefined }] }, 'data')).toThrow('data.a[1].b')
  })

  test('shared references that are not cycles are allowed', () => {
    const shared = { x: 1 }
    expect(isJsonValue({ a: shared, b: shared })).toBe(true)
  })
})