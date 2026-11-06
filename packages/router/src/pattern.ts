export type Segment =
  | { readonly kind: 'static'; readonly value: string }
  | { readonly kind: 'param'; readonly name: string }
  | { readonly kind: 'catch-all'; readonly name: string }

export class RouteConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RouteConfigError'
  }
}

const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/
const RANK = { static: 0, param: 1, 'catch-all': 2 } as const

/**
 * Splits a path into non-empty segments. Trailing and doubled slashes are dropped.
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter((part) => part.length > 0)
}

/**
 * Parses a route pattern such as `/users/[id]` or `/docs/[...slug]`.
 */
export function parsePattern(pattern: string): Segment[] {
  if (!pattern.startsWith('/')) throw new RouteConfigError(`Route pattern must start with '/': '${pattern}'`)
  const parts = splitPath(pattern)
  const names = new Set<string>()
  return parts.map((part, index): Segment => {
    if (part.startsWith('[') && part.endsWith(']')) {
      const inner = part.slice(1, -1)
      const catchAll = inner.startsWith('...')
      const name = catchAll ? inner.slice(3) : inner
      if (!PARAM_NAME.test(name)) throw new RouteConfigError(`Invalid parameter name in segment '${part}' of '${pattern}'`)
      if (names.has(name)) throw new RouteConfigError(`Duplicate parameter '${name}' in '${pattern}'`)
      if (catchAll && index !== parts.length - 1) throw new RouteConfigError(`Catch-all segment '${part}' must be the last segment of '${pattern}'`)
      names.add(name)
      return catchAll ? { kind: 'catch-all', name } : { kind: 'param', name }
    }
    if (/[[\]]/.test(part)) throw new RouteConfigError(`Invalid segment '${part}' in '${pattern}': brackets are only allowed around a whole dynamic segment`)
    return { kind: 'static', value: part }
  })
}

/**
 * Identifies a pattern's shape. Patterns that differ only in parameter names share a key.
 */
export function shapeKey(segments: readonly Segment[]): string {
  return segments.map((segment) => {
    if (segment.kind === 'static') return `=${segment.value}`
    return segment.kind === 'param' ? ':' : '*'
  }).join('/')
}

/**
 * Matches decoded path parts. Returns the params, or null when the pattern does not match.
 */
export function matchSegments(segments: readonly Segment[], parts: readonly string[]): Record<string, string | readonly string[]> | null {
  const params: Record<string, string | readonly string[]> = {}
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    if (segment === undefined) return null
    if (segment.kind === 'catch-all') {
      const rest = parts.slice(index)
      if (rest.length === 0) return null
      params[segment.name] = rest
      return params
    }
    const part = parts[index]
    if (part === undefined) return null
    if (segment.kind === 'static') {
      if (segment.value !== part) return null
    } else {
      params[segment.name] = part
    }
  }
  return segments.length === parts.length ? params : null
}

/**
 * Orders two patterns that match the same URL. A negative result means `a` is more
 * specific: at the first position where kinds differ, static beats dynamic beats catch-all.
 */
export function compareSegments(a: readonly Segment[], b: readonly Segment[]): number {
  const length = Math.min(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const left = a[index]
    const right = b[index]
    if (left === undefined || right === undefined) break
    if (left.kind !== right.kind) return RANK[left.kind] - RANK[right.kind]
  }
  return 0
}