import type { Child } from './types.ts'

export function describeType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

export function isChildArray(value: unknown): value is readonly Child[] {
  return Array.isArray(value)
}