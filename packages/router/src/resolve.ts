import { assertJsonValue } from './json.ts'
import type { Matcher } from './matcher.ts'
import { isOutcome } from './outcomes.ts'
import type { ChainEntry, Guard, HookContext, HookMap, JsonValue, Loader, Outcome, Resolution, ResolveInput, RouteParams } from './types.ts'

type Stop = Extract<Resolution, { kind: 'redirect' | 'denied' | 'not-found' }>

interface Slot {
  readonly id: string
  readonly kind: 'layout' | 'page'
}

function stopFor(outcome: Outcome): Stop {
  switch (outcome.$$outcome) {
    case 'redirect': return { kind: 'redirect', location: outcome.location, status: outcome.status }
    case 'deny': return { kind: 'denied', status: outcome.status, message: outcome.message }
    case 'not-found': return { kind: 'not-found' }
  }
}

/**
 * Resolves a pathname to an outcome.
 *
 * Order: match the route, run every guard from the outermost layout to the page, then
 * run every loader in the same order. The first outcome, thrown error or invalid value
 * stops resolution. Each chain entry keeps its own loader data, and entries without a
 * loader have `null` data.
 */
export async function resolve<C>(matcher: Matcher, hooks: HookMap<C>, input: ResolveInput<C>): Promise<Resolution> {
  const matched = matcher.match(input.pathname)
  if (matched.kind === 'malformed') return { kind: 'bad-request', reason: matched.reason }
  if (matched.kind === 'not-found') return { kind: 'not-found' }
  const { route, params } = matched
  const slots: Slot[] = [...route.layouts.map((id): Slot => ({ id, kind: 'layout' })), { id: route.id, kind: 'page' }]
  const context: HookContext<RouteParams, C> = { params, pathname: input.pathname, search: input.search ?? '', context: input.context }
  for (const slot of slots) {
    const guard = hooks.get(slot.id)?.guard
    if (guard === undefined) continue
    let result: unknown
    try { result = await (guard as Guard<RouteParams, C>)(context) } catch (error) { return { kind: 'error', error, entryId: slot.id, phase: 'guard' } }
    if (result === undefined) continue
    if (isOutcome(result)) return stopFor(result)
    return { kind: 'error', error: new TypeError(`Guard for '${slot.id}' must return nothing, redirect(), deny() or notFound()`), entryId: slot.id, phase: 'guard' }
  }
  const chain: ChainEntry[] = []
  for (const slot of slots) {
    const loader = hooks.get(slot.id)?.loader
    let data: JsonValue = null
    if (loader !== undefined) {
      let result: unknown
      try {
        result = await (loader as Loader<RouteParams, JsonValue, C>)(context)
        if (isOutcome(result)) return stopFor(result)
        assertJsonValue(result, `loader data of '${slot.id}'`)
        data = result
      } catch (error) {
        return { kind: 'error', error, entryId: slot.id, phase: 'loader' }
      }
    }
    chain.push({ id: slot.id, kind: slot.kind, data })
  }
  return { kind: 'page', route, pathname: input.pathname, params, chain }
}