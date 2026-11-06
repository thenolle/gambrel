import { compareSegments, matchSegments, parsePattern, RouteConfigError, shapeKey, splitPath, type Segment } from './pattern.ts'
import type { RouteParams, RouteRecord } from './types.ts'

export type MatchResult =
  | { readonly kind: 'match'; readonly route: RouteRecord; readonly params: RouteParams }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'malformed'; readonly reason: string }

export interface Matcher {
  /**
   * The routes in deterministic order (sorted by ID).
   */
  readonly routes: readonly RouteRecord[]
  /**
   * Matches a pathname (no query string or hash). Static beats dynamic beats catch-all,
   * compared left to right. Trailing and doubled slashes are ignored.
   */
  match(pathname: string): MatchResult
}

interface CompiledRoute {
  readonly route: RouteRecord
  readonly segments: readonly Segment[]
}

function byId(a: RouteRecord, b: RouteRecord): number {
  if (a.id < b.id) return -1
  return a.id > b.id ? 1 : 0
}

/**
 * Validates route records and builds a matcher. Throws `RouteConfigError` for duplicate
 * IDs, invalid or ambiguous patterns, and layout IDs that collide with route IDs.
 */
export function createMatcher(records: readonly RouteRecord[]): Matcher {
  const routes = [...records].sort(byId)
  const ids = new Set<string>()
  const shapes = new Map<string, RouteRecord>()
  const layoutIds = new Set<string>()
  const compiled: CompiledRoute[] = []
  for (const route of routes) {
    if (route.id === '') throw new RouteConfigError(`Route '${route.pattern}' has an empty id`)
    if (ids.has(route.id)) throw new RouteConfigError(`Duplicate route id '${route.id}'`)
    ids.add(route.id)
    for (const layoutId of route.layouts) layoutIds.add(layoutId)
    const segments = parsePattern(route.pattern)
    const key = shapeKey(segments)
    const existing = shapes.get(key)
    if (existing !== undefined) throw new RouteConfigError(`Ambiguous routes: '${existing.pattern}' (${existing.id}) and '${route.pattern}' (${route.id}) match the same URLs`)
    shapes.set(key, route)
    compiled.push({ route, segments })
  }
  for (const id of ids) {
    if (layoutIds.has(id)) throw new RouteConfigError(`Id '${id}' is used by both a route and a layout`)
  }
  return {
    routes,
    match(pathname) {
      if (!pathname.startsWith('/')) return { kind: 'malformed', reason: `Pathname must start with '/': '${pathname}'` }
      let parts: string[]
      try {
        parts = splitPath(pathname).map((part) => decodeURIComponent(part))
      } catch (error) {
        if (!(error instanceof URIError)) throw error
        return { kind: 'malformed', reason: 'Malformed percent-encoding in pathname' }
      }
      let best: { readonly entry: CompiledRoute; readonly params: RouteParams } | undefined
      for (const entry of compiled) {
        const params = matchSegments(entry.segments, parts)
        if (params === null) continue
        if (best === undefined || compareSegments(entry.segments, best.entry.segments) < 0) best = { entry, params }
      }
      if (best === undefined) return { kind: 'not-found' }
      return { kind: 'match', route: best.entry.route, params: best.params }
    }
  }
}