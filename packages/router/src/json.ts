import type { JsonValue } from './types.ts'

function typeName(value: unknown): string {
  if (value === null) return 'null'
  return Array.isArray(value) ? 'array' : typeof value
}

function visit(value: unknown, path: string, ancestors: Set<object>): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new TypeError(`${path} is not a finite number`)
    return
  }
  if (value === undefined) throw new TypeError(`${path} is undefined; JSON has no undefined (use null for no value)`)
  if (typeof value !== 'object') throw new TypeError(`${path} has unsupported type '${typeName(value)}'`)
  if (ancestors.has(value)) throw new TypeError(`${path} contains a circular reference`)
  ancestors.add(value)
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      if (!(index in value)) throw new TypeError(`${path}[${index}] is an empty array slot`)
      visit(value[index], `${path}[${index}]`, ancestors)
    }
  } else {
    const prototype: unknown = Object.getPrototypeOf(value)
    if (prototype !== Object.prototype && prototype !== null) throw new TypeError(`${path} is not a plain object (class instances, Date, Map and Set are not supported)`)
    for (const key of Object.keys(value)) visit((value as Record<string, unknown>)[key], `${path}.${key}`, ancestors)
  }
  ancestors.delete(value)
}

/**
 * Asserts that a value is plain JSON: null, booleans, strings, finite numbers, arrays
 * and plain objects. Anything else throws a TypeError naming the offending path.
 * Symbol-keyed properties are ignored.
 */
export function assertJsonValue(value: unknown, label = 'value'): asserts value is JsonValue {
  visit(value, label, new Set())
}

export function isJsonValue(value: unknown): value is JsonValue {
  try {
    assertJsonValue(value)
    return true
  } catch {
    return false
  }
}