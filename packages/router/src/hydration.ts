import { assertJsonValue, isJsonValue } from './json.ts'
import type { Matcher } from './matcher.ts'
import type { ChainEntry, Resolution, RouteParamValue, RouteParams, RouteRecord } from './types.ts'

export const HYDRATION_VERSION = 1
export const PAYLOAD_ELEMENT_ID = 'gambrel-data'
export const FRAMEWORK_ATTRIBUTE = 'data-gambrel'

export type PageResolution = Extract<Resolution, { readonly kind: 'page' }>

export interface HydrationPayload {
  readonly version: 1
  readonly routeId: string
  readonly pathname: string
  readonly params: RouteParams
  readonly chain: readonly ChainEntry[]
}

export class HydrationPayloadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'HydrationPayloadError'
  }
}

const PAYLOAD_KEYS: ReadonlySet<string> = new Set(['version', 'routeId', 'pathname', 'params', 'chain'])
const ENTRY_KEYS: ReadonlySet<string> = new Set(['id', 'kind', 'data'])
const UNSAFE = /[<>&\u2028\u2029]/g
const ESCAPES: Readonly<Record<string, string>> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029'
}

function fail(reason: string): never {
  throw new HydrationPayloadError(`Invalid hydration payload: ${reason}`)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Builds the payload for a resolved page.
 */
export function createPayload(resolution: PageResolution): HydrationPayload {
  return {
    version: HYDRATION_VERSION,
    routeId: resolution.route.id,
    pathname: resolution.pathname,
    params: resolution.params,
    chain: resolution.chain
  }
}

/**
 * Serializes a payload to JSON that is safe inside a `<script type="application/json">`
 * element: `<`, `>`, `&`, U+2028 and U+2029 are written as unicode escapes, so the text
 * can never contain `</script>` or an HTML comment opener, and decodes to the same value.
 */
export function serializePayload(payload: HydrationPayload): string {
  assertJsonValue(payload, 'hydration payload')
  return JSON.stringify(payload).replace(UNSAFE, (character) => ESCAPES[character] ?? character)
}

function parseParams(value: unknown): RouteParams {
  if (!isRecord(value)) return fail('params must be an object')
  const params: Record<string, RouteParamValue> = {}
  for (const key of Object.keys(value)) {
    const entry = value[key]
    if (typeof entry === 'string') params[key] = entry
    else if (Array.isArray(entry) && entry.every((part): part is string => typeof part === 'string')) params[key] = entry
    else return fail(`params.${key} must be a string or an array of strings`)
  }
  return params
}

function parseChain(value: unknown): ChainEntry[] {
  if (!Array.isArray(value) || value.length === 0) return fail('chain must be a non-empty array')
  const chain: ChainEntry[] = []
  for (let index = 0; index < value.length; index += 1) {
    const item: unknown = value[index]
    if (!isRecord(item)) return fail(`chain[${index}] must be an object`)
    const stray = Object.keys(item).find((key) => !ENTRY_KEYS.has(key))
    if (stray !== undefined) return fail(`chain[${index}] has unknown field '${stray}'`)
    const id = item['id']
    if (typeof id !== 'string' || id === '') return fail(`chain[${index}].id must be a non-empty string`)
    const kind = index === value.length - 1 ? 'page' : 'layout'
    if (item['kind'] !== kind) return fail(`chain[${index}].kind must be '${kind}'`)
    const data = item['data']
    if (!isJsonValue(data)) return fail(`chain[${index}].data is not valid JSON data`)
    chain.push({ id, kind, data })
  }
  return chain
}

/**
 * Parses and shape-validates the embedded payload text. Treat it as untrusted input:
 * unknown fields, wrong types and unsupported versions all throw HydrationPayloadError.
 */
export function parsePayload(text: string): HydrationPayload {
  let value: unknown
  try { value = JSON.parse(text) } catch { return fail('not valid JSON') }
  if (!isRecord(value)) return fail('expected an object')
  const stray = Object.keys(value).find((key) => !PAYLOAD_KEYS.has(key))
  if (stray !== undefined) return fail(`unknown field '${stray}'`)
  if (value['version'] !== HYDRATION_VERSION) return fail(`unsupported version ${String(value['version'])}; expected ${HYDRATION_VERSION}`)
  const routeId = value['routeId']
  if (typeof routeId !== 'string' || routeId === '') return fail('routeId must be a non-empty string')
  const pathname = value['pathname']
  if (typeof pathname !== 'string' || !pathname.startsWith('/')) return fail("pathname must start with '/'")
  return {
    version: HYDRATION_VERSION,
    routeId,
    pathname,
    params: parseParams(value['params']),
    chain: parseChain(value['chain'])
  }
}

function sameValue(a: RouteParamValue | undefined, b: RouteParamValue | undefined): boolean {
  if (typeof a === 'string' || typeof b === 'string') return a === b
  if (a === undefined || b === undefined) return false
  return a.length === b.length && a.every((part, index) => part === b[index])
}

function sameParams(a: RouteParams, b: RouteParams): boolean {
  const keys = Object.keys(a)
  return keys.length === Object.keys(b).length && keys.every((key) => sameValue(a[key], b[key]))
}

/**
 * Cross-checks a parsed payload against the client's own route table and the page's
 * pathname. Returns the matched route, or throws HydrationPayloadError when the payload
 * is for another URL, another route, other params, or another layout chain.
 */
export function verifyPayload(payload: HydrationPayload, matcher: Matcher, pathname: string): RouteRecord {
  if (payload.pathname !== pathname) return fail(`payload is for '${payload.pathname}' but the page is '${pathname}'`)
  const match = matcher.match(payload.pathname)
  if (match.kind !== 'match') return fail(`'${payload.pathname}' does not match any client route`)
  if (match.route.id !== payload.routeId) return fail(`payload route '${payload.routeId}' differs from client route '${match.route.id}'`)
  if (!sameParams(match.params, payload.params)) return fail('params differ from the client match')
  const expected = [...match.route.layouts, match.route.id]
  const same = payload.chain.length === expected.length && payload.chain.every((entry, index) => entry.id === expected[index])
  if (!same) return fail('chain does not match the route layouts')
  return match.route
}