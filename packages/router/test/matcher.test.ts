import { describe, expect, test } from 'bun:test'
import { createMatcher, type Matcher, type RouteParams, type RouteRecord } from '../src/index.ts'

function route(id: string, pattern: string, layouts: readonly string[] = []): RouteRecord {
  return { id, pattern, layouts }
}

function matched(matcher: Matcher, pathname: string): { id: string; params: RouteParams } {
  const result = matcher.match(pathname)
  if (result.kind !== 'match') throw new Error(`Expected a match for '${pathname}', got '${result.kind}'`)
  return { id: result.route.id, params: result.params }
}

const records = [
  route('page:/', '/'),
  route('page:/users/me', '/users/me'),
  route('page:/users/[id]', '/users/[id]'),
  route('page:/[...slug]', '/[...slug]')
]

describe('precedence', () => {
  test('static beats dynamic beats catch-all in any registration order', () => {
    for (const ordered of [records, [...records].reverse()]) {
      const matcher = createMatcher(ordered)
      expect(matched(matcher, '/').id).toBe('page:/')
      expect(matched(matcher, '/users/me').id).toBe('page:/users/me')
      expect(matched(matcher, '/users/42')).toEqual({ id: 'page:/users/[id]', params: { id: '42' } })
      expect(matched(matcher, '/other/a/b')).toEqual({ id: 'page:/[...slug]', params: { slug: ['other', 'a', 'b'] } })
    }
  })

  test('the route table is sorted by id regardless of input order', () => {
    const forward = createMatcher(records).routes.map((r) => r.id)
    const backward = createMatcher([...records].reverse()).routes.map((r) => r.id)
    expect(forward).toEqual(backward)
    expect(forward).toEqual([...forward].sort())
  })
})

describe('matching', () => {
  test('decodes params and catch-all parts', () => {
    const matcher = createMatcher(records)
    expect(matched(matcher, '/users/a%20b').params).toEqual({ id: 'a b' })
    expect(matched(matcher, '/x/caf%C3%A9/y').params).toEqual({ slug: ['x', 'café', 'y'] })
  })

  test('ignores trailing and doubled slashes', () => {
    const matcher = createMatcher(records)
    expect(matched(matcher, '/users/42/').id).toBe('page:/users/[id]')
    expect(matched(matcher, '//users//42').id).toBe('page:/users/[id]')
  })

  test('a catch-all needs at least one segment', () => {
    const matcher = createMatcher([route('page:/docs/[...slug]', '/docs/[...slug]')])
    expect(matcher.match('/docs')).toEqual({ kind: 'not-found' })
    expect(matched(matcher, '/docs/a').params).toEqual({ slug: ['a'] })
  })

  test('reports not-found and malformed input', () => {
    const matcher = createMatcher([route('page:/about', '/about')])
    expect(matcher.match('/missing')).toEqual({ kind: 'not-found' })
    expect(matcher.match('/%E0%A4%A').kind).toBe('malformed')
    expect(matcher.match('about').kind).toBe('malformed')
  })

  test('returns the route record with its layouts', () => {
    const matcher = createMatcher([route('page:/a', '/a', ['layout:/'])])
    const result = matcher.match('/a')
    expect(result.kind === 'match' && result.route.layouts).toEqual(['layout:/'])
  })
})

describe('configuration errors', () => {
  test('rejects duplicate ids', () => {
    expect(() => createMatcher([route('a', '/a'), route('a', '/b')])).toThrow('Duplicate route id')
  })

  test('rejects ambiguous patterns', () => {
    expect(() => createMatcher([route('a', '/u/[id]'), route('b', '/u/[name]')])).toThrow('Ambiguous')
  })

  test('rejects invalid patterns', () => {
    expect(() => createMatcher([route('a', 'no-slash')])).toThrow("must start with '/'")
    expect(() => createMatcher([route('a', '/[...rest]/x')])).toThrow('last segment')
    expect(() => createMatcher([route('a', '/[1bad]')])).toThrow('Invalid parameter name')
    expect(() => createMatcher([route('a', '/[x]/[x]')])).toThrow('Duplicate parameter')
    expect(() => createMatcher([route('a', '/a[x]')])).toThrow('brackets')
  })

  test('rejects a layout id that is also a route id', () => {
    expect(() => createMatcher([route('x', '/a', ['y']), route('y', '/b')])).toThrow('both a route and a layout')
  })
})