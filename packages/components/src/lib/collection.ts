export interface ValuedItem {
  readonly value: string
}

/**
 * Rejects empty and duplicate identifiers before rendering linked collections.
 */
export function assertUniqueValues(items: readonly ValuedItem[], component: string): void {
  const seen = new Set<string>()
  for (const item of items) {
    if (item.value.trim() === '' || seen.has(item.value)) throw new TypeError(`${component} values must be non-empty and unique`)
    seen.add(item.value)
  }
}

/**
 * Requires an explicit id for components with linked ARIA elements.
 */
export function assertComponentId(id: string, component: string): void {
  if (id.trim() === '' || /\s/.test(id)) throw new TypeError(`${component} requires a non-empty id without whitespace`)
}

export function normalizeSearch(value: string): string {
  return value.normalize('NFKC').toLocaleLowerCase().trim()
}