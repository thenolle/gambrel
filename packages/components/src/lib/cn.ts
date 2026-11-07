export type ClassValue =
  | string
  | number
  | false
  | null
  | undefined
  | readonly ClassValue[]
  | { readonly [name: string]: boolean | null | undefined }

/**
 * Joins class names. Falsy values are skipped, arrays are flattened, objects add their
 * keys whose value is truthy, and repeated names appear once, in first-seen order.
 */
export function cn(...values: readonly ClassValue[]): string {
  const seen = new Set<string>()
  const add = (value: ClassValue): void => {
    if (value === false || value === null || value === undefined || value === '') return
    if (typeof value === 'string' || typeof value === 'number') {
      for (const name of String(value).split(/\s+/)) if (name !== '') seen.add(name)
    } else if (Array.isArray(value)) {
      for (const item of value as readonly ClassValue[]) add(item)
    } else {
      for (const [name, enabled] of Object.entries(value as Record<string, boolean | null | undefined>)) {
        if (enabled === true) add(name)
      }
    }
  }
  for (const value of values) add(value)
  return [...seen].join(' ')
}