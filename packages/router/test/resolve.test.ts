import { describe, expect, test } from 'bun:test'
import { createMatcher, deny, notFound, redirect, resolve, type EntryHooks, type Guard, type HookMap, type JsonValue, type Loader, type LoaderData, type ParamsOf } from '../src/index.ts'

const matcher = createMatcher([
  { id: 'page:/users/[id]', pattern: '/users/[id]', layouts: ['layout:/', 'layout:/users'] }
])

const input = { pathname: '/users/42', search: '?tab=1', context: null }

function hooksWithLog(log: string[], overrides: Record<string, EntryHooks<null>> = {}): HookMap<null> {
  const make = (id: string, data: JsonValue | undefined): EntryHooks<null> => ({
    guard: () => {
      log.push(`guard ${id}`)
    },
    ...(data === undefined ? {} : { loader: () => (log.push(`loader ${id}`), data) })
  })
  return new Map<string, EntryHooks<null>>([
    ['layout:/', make('layout:/', { site: 'gambrel' })],
    ['layout:/users', make('layout:/users', undefined)],
    ['page:/users/[id]', make('page:/users/[id]', { id: '42' })],
    ...Object.entries(overrides)
  ])
}

describe('resolution order and data', () => {
  test('runs all guards before any loader, outer to inner', async () => {
    const log: string[] = []
    const result = await resolve(matcher, hooksWithLog(log), input)
    expect(log).toEqual([
      'guard layout:/',
      'guard layout:/users',
      'guard page:/users/[id]',
      'loader layout:/',
      'loader page:/users/[id]'
    ])
    expect(result.kind).toBe('page')
  })

  test('keeps data per chain entry; entries without a loader get null', async () => {
    const result = await resolve(matcher, hooksWithLog([]), input)
    if (result.kind !== 'page') throw new Error(`Unexpected ${result.kind}`)
    expect(result.params).toEqual({ id: '42' })
    expect(result.chain).toEqual([
      { id: 'layout:/', kind: 'layout', data: { site: 'gambrel' } },
      { id: 'layout:/users', kind: 'layout', data: null },
      { id: 'page:/users/[id]', kind: 'page', data: { id: '42' } }
    ])
  })

  test('passes params, pathname, search and context to hooks', async () => {
    const hooks = new Map<string, EntryHooks<string>>([['page:/users/[id]', { loader: (ctx) => ({ pathname: ctx.pathname, search: ctx.search, context: ctx.context }) }]])
    const result = await resolve(matcher, hooks, { pathname: '/users/7', search: '?a=1', context: 'ctx-value' })
    if (result.kind !== 'page') throw new Error(`Unexpected ${result.kind}`)
    expect(result.chain[2]?.data).toEqual({ pathname: '/users/7', search: '?a=1', context: 'ctx-value' })
  })
})

describe('stopping outcomes', () => {
  test('a guard redirect stops before later guards and every loader', async () => {
    const log: string[] = []
    const hooks = hooksWithLog(log, {
      'layout:/users': { guard: () => redirect('/login', 302) }
    })
    expect(await resolve(matcher, hooks, input)).toEqual({ kind: 'redirect', location: '/login', status: 302 })
    expect(log).toEqual(['guard layout:/'])
  })

  test('guards and loaders can deny, redirect and report not-found', async () => {
    const denied = hooksWithLog([], { 'page:/users/[id]': { guard: () => deny(403, 'nope') } })
    expect(await resolve(matcher, denied, input)).toEqual({ kind: 'denied', status: 403, message: 'nope' })
    const moved = hooksWithLog([], { 'page:/users/[id]': { loader: () => redirect('/new', 307) } })
    expect(await resolve(matcher, moved, input)).toEqual({ kind: 'redirect', location: '/new', status: 307 })
    const missing = hooksWithLog([], { 'page:/users/[id]': { loader: () => notFound() } })
    expect(await resolve(matcher, missing, input)).toEqual({ kind: 'not-found' })
  })

  test('unmatched and malformed paths resolve without running hooks', async () => {
    const log: string[] = []
    expect(await resolve(matcher, hooksWithLog(log), { ...input, pathname: '/nope' })).toEqual({ kind: 'not-found' })
    const bad = await resolve(matcher, hooksWithLog(log), { ...input, pathname: '/users/%E0%A4%A' })
    expect(bad.kind).toBe('bad-request')
    expect(log).toEqual([])
  })
})

describe('errors', () => {
  test('a throwing guard becomes an error resolution that keeps the error', async () => {
    const boom = new Error('db down')
    const hooks = hooksWithLog([], {
      'layout:/': {
        guard: () => {
          throw boom
        }
      }
    })
    expect(await resolve(matcher, hooks, input)).toEqual({
      kind: 'error',
      error: boom,
      entryId: 'layout:/',
      phase: 'guard'
    })
  })

  test('a guard returning a value is an error', async () => {
    const hooks = hooksWithLog([], { 'layout:/': { guard: (() => true) as unknown as Guard<never, null> } })
    const result = await resolve(matcher, hooks, input)
    expect(result.kind === 'error' && result.phase).toBe('guard')
  })

  test('loader data must be plain JSON', async () => {
    const bad: unknown[] = [undefined, new Date(), Number.NaN, () => 1]
    for (const value of bad) {
      const hooks = hooksWithLog([], {
        'page:/users/[id]': { loader: (() => value) as unknown as Loader<never, JsonValue, null> }
      })
      const result = await resolve(matcher, hooks, input)
      expect(result.kind).toBe('error')
      if (result.kind === 'error') {
        expect(result.phase).toBe('loader')
        expect(result.entryId).toBe('page:/users/[id]')
        expect(result.error).toBeInstanceOf(TypeError)
      }
    }
  })
})

describe('types', () => {
  test('params and loader data are inferred from the pattern', async () => {
    const loader: Loader<ParamsOf<'/users/[id]/files/[...path]'>, { id: string; depth: number }> = (ctx) => ({
      id: ctx.params.id,
      depth: ctx.params.path.length
    })
    const data: LoaderData<typeof loader> = { id: 'a', depth: 1 }
    expect(data.depth).toBe(1)
    expect(await loader({ params: { id: 'a', path: ['x', 'y'] }, pathname: '', search: '', context: null })).toEqual({
      id: 'a',
      depth: 2
    })
  })
})