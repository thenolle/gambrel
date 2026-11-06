export interface Segment {
  readonly kind: 'static' | 'param'
  readonly value: string
}

export interface Entry<T> {
  readonly method: string
  readonly path: string
  readonly segments: readonly Segment[]
  readonly value: T
}

const PARAM_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/

/**
 * Splits a pathname into non-empty segments. Empty segments (trailing or doubled
 * slashes) are dropped.
 */
export function splitPath(path: string): string[] {
  return path.split('/').filter((part) => part.length > 0)
}

/**
 * Compiles a route path such as `/users/:id` into segments. Throws on a path that
 * does not start with `/`, an invalid parameter name, or a duplicate parameter.
 */
export function compilePath(path: string): Segment[] {
  if (!path.startsWith('/')) throw new TypeError(`Route path must start with '/': '${path}'`)
  const seen = new Set<string>()
  return splitPath(path).map((part): Segment => {
    if (!part.startsWith(':')) return { kind: 'static', value: part }
    const name = part.slice(1)
    if (!PARAM_NAME.test(name)) throw new TypeError(`Invalid parameter name '${part}' in route path '${path}'`)
    if (seen.has(name)) throw new TypeError(`Duplicate parameter ':${name}' in route path '${path}'`)
    seen.add(name)
    return { kind: 'param', value: name }
  })
}

/**
 * A key identifying a route's shape. Routes that differ only in parameter names
 * share a key and are therefore duplicates.
 */
export function shapeKey(segments: readonly Segment[]): string {
  return segments.map((segment) => (segment.kind === 'param' ? ':' : segment.value)).join('/')
}

/**
 * Matches decoded path parts against compiled segments. Returns the params, or null.
 */
export function matchSegments(segments: readonly Segment[], parts: readonly string[]): Record<string, string> | null {
  if (segments.length !== parts.length) return null
  const params: Record<string, string> = {}
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index]
    const part = parts[index]
    if (segment === undefined || part === undefined) return null
    if (segment.kind === 'static') {
      if (segment.value !== part) return null
    } else {
      params[segment.value] = part
    }
  }
  return params
}

/**
 * Orders two same-length matching routes. A negative result means `a` is more specific:
 * at the first position where kinds differ, static beats param.
 */
export function compareSpecificity(a: readonly Segment[], b: readonly Segment[]): number {
  const length = Math.min(a.length, b.length)
  for (let index = 0; index < length; index += 1) {
    const left = a[index]
    const right = b[index]
    if (left === undefined || right === undefined) break
    if (left.kind !== right.kind) return left.kind === 'static' ? -1 : 1
  }
  return 0
}