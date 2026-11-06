import type { DenyOutcome, NotFoundOutcome, Outcome, RedirectOutcome, RedirectStatus } from './types.ts'

/**
 * Stops the request with a redirect. `location` may be relative. Defaults to 302.
 */
export function redirect(location: string, status: RedirectStatus = 302): RedirectOutcome {
  return { $$outcome: 'redirect', location, status }
}

/**
 * Stops the request with an error status in the 400 to 599 range. Defaults to 403.
 */
export function deny(status = 403, message?: string): DenyOutcome {
  if (!Number.isInteger(status) || status < 400 || status > 599) {
    throw new RangeError(`deny() status must be an integer from 400 to 599, received ${status}`)
  }
  return { $$outcome: 'deny', status, message }
}

/**
 * Stops the request and reports the route as not found.
 */
export function notFound(): NotFoundOutcome {
  return { $$outcome: 'not-found' }
}

export function isOutcome(value: unknown): value is Outcome {
  if (typeof value !== 'object' || value === null || !('$$outcome' in value)) return false
  return value.$$outcome === 'redirect' || value.$$outcome === 'deny' || value.$$outcome === 'not-found'
}