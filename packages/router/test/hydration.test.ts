import { describe, expect, test } from 'bun:test'
import { createElement, renderToString } from '@gambrel/view'
import {
  composeRoute,
  createMatcher,
  createPayload,
  HydrationPayloadError,
  parsePayload,
  resolve,
  RouteConfigError,
  serializePayload,
  verifyPayload,
  type AnyRouteComponent,
  type HydrationPayload,
  type LayoutProps,
  type PageProps
} from '../src/index.ts'

const matcher = createMatcher([{ id: 'page:/users/[id]', pattern: '/users/[id]', layouts: ['layout:/'] }])

const payload: HydrationPayload = {
  version: 1,
  routeId: 'page:/users/[id]',
  pathname: '/users/42',
  params: { id: '42' },
  chain: [
    { id: 'layout:/', kind: 'layout', data: 'site' },
    { id: 'page:/users/[id]', kind: 'page', data: { name: 'Ada' } }
  ]
}

describe('payload serialization', () => {
  test('round-trips', () => {
    expect(parsePayload(serializePayload(payload))).toEqual(payload)
  })

  test('cannot break out of a script element', () => {
    const hostile: HydrationPayload = {
      ...payload,
      chain: [
        { id: 'layout:/', kind: 'layout', data: null },
        { id: 'page:/users/[id]', kind: 'page', data: { html: '</script><img src=x onerror=alert(1)><!-- & \u2028\u2029' } }
      ]
    }
    const text = serializePayload(hostile)
    expect(/[<>&\u2028\u2029]/.test(text)).toBe(false)
    expect(parsePayload(text)).toEqual(hostile)
  })

  test('refuses to serialize values JSON cannot carry', () => {
    const bad = { ...payload, chain: [{ id: 'page:/x', kind: 'page' as const, data: new Date() as never }] }
    expect(() => serializePayload(bad)).toThrow(TypeError)
  })
})

describe('payload validation', () => {
  test('rejects malformed, unsupported and unknown input', () => {
    const entry = { id: 'a', kind: 'page', data: null }
    const bad = [
      'not json',
      '[]',
      JSON.stringify({ ...payload, version: 2 }),
      JSON.stringify({ ...payload, extra: 1 }),
      JSON.stringify({ ...payload, routeId: '' }),
      JSON.stringify({ ...payload, pathname: 'users' }),
      JSON.stringify({ ...payload, params: { id: 1 } }),
      JSON.stringify({ ...payload, chain: [] }),
      JSON.stringify({ ...payload, chain: [entry, entry] }),
      JSON.stringify({ ...payload, chain: [{ ...entry, extra: 1 }] }),
      JSON.stringify({ ...payload, chain: [{ id: 'a', kind: 'page' }] })
    ]
    for (const text of bad) expect(() => parsePayload(text)).toThrow(HydrationPayloadError)
  })

  test('verifies the payload against the client route table', () => {
    expect(verifyPayload(payload, matcher, '/users/42').id).toBe('page:/users/[id]')
    expect(() => verifyPayload(payload, matcher, '/users/43')).toThrow('page is')
    expect(() => verifyPayload({ ...payload, routeId: 'page:/other' }, matcher, '/users/42')).toThrow('differs')
    expect(() => verifyPayload({ ...payload, params: { id: '1' } }, matcher, '/users/42')).toThrow('params')
    expect(() => verifyPayload({ ...payload, chain: [...payload.chain].reverse() }, matcher, '/users/42')).toThrow(HydrationPayloadError)
    expect(() => verifyPayload({ ...payload, pathname: '/nope' }, matcher, '/nope')).toThrow('any client route')
  })

  test('createPayload captures a page resolution', async () => {
    const resolution = await resolve(matcher, new Map(), { pathname: '/users/42', context: null })
    if (resolution.kind !== 'page') throw new Error(`Unexpected ${resolution.kind}`)
    const created = createPayload(resolution)
    expect(created.version).toBe(1)
    expect(created.routeId).toBe('page:/users/[id]')
    expect(created.params).toEqual({ id: '42' })
    expect(created.chain.map((entry) => entry.id)).toEqual(['layout:/', 'page:/users/[id]'])
  })
})

describe('composeRoute', () => {
  const layout = (props: LayoutProps): ReturnType<typeof createElement> =>
    createElement('main', { children: [createElement('h1', { children: String(props.data) }), props.children] })
  const page = (props: PageProps): ReturnType<typeof createElement> =>
    createElement('p', { children: JSON.stringify(props.data) })
  const components = new Map<string, AnyRouteComponent>([
    ['layout:/', layout],
    ['page:/users/[id]', page]
  ])

  test('nests layouts outermost first and gives each entry its own data', async () => {
    const html = await renderToString(composeRoute(payload.chain, components, payload.params))
    expect(html).toBe('<main><h1>site</h1><p>{"name":"Ada"}</p></main>')
  })

  test('throws when a component is missing', () => {
    expect(() => composeRoute(payload.chain, new Map(), payload.params)).toThrow(RouteConfigError)
  })
})