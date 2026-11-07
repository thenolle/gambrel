export interface NumberBounds {
  readonly min?: number | undefined
  readonly max?: number | undefined
  readonly step?: number | undefined
}

/**
 * Rejects invalid numeric bounds instead of emitting misleading control attributes.
 */
export function validateNumberBounds(bounds: NumberBounds): void {
  const { min, max, step = 1 } = bounds
  if (min !== undefined && !Number.isFinite(min)) throw new RangeError('NumberInput min must be finite')
  if (max !== undefined && !Number.isFinite(max)) throw new RangeError('NumberInput max must be finite')
  if (min !== undefined && max !== undefined && min > max) throw new RangeError('NumberInput min must not exceed max')
  if (!Number.isFinite(step) || step <= 0) throw new RangeError('NumberInput step must be a positive finite number')
}

/**
 * Converts a complete numeric draft to a finite number, or null.
 */
export function parseNumberDraft(draft: string): number | null {
  const trimmed = draft.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) ? value : null
}

export function clampNumber(value: number, bounds: NumberBounds): number {
  return Math.min(bounds.max ?? Infinity, Math.max(bounds.min ?? -Infinity, value))
}

/**
 * Adds one step and rounds floating-point arithmetic to twelve significant digits.
 */
export function stepNumber(current: number | null, direction: -1 | 1, bounds: NumberBounds): number {
  const step = bounds.step ?? 1
  const start = current ?? bounds.min ?? 0
  const next = current === null ? start : Number((current + direction * step).toPrecision(12))
  return clampNumber(next, bounds)
}