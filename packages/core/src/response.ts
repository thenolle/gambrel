export type RedirectStatus = 301 | 302 | 303 | 307 | 308

/**
 * Builds a response and applies `contentType` unless `init` already sets one.
 * Bun adds its own content type to string bodies, so the caller's headers are
 * inspected on a body-less response first.
 */
function withDefaultContentType(body: string | null, contentType: string, init: ResponseInit | undefined): Response {
  const response = new Response(body, init)
  if (!new Response(null, init).headers.has('content-type')) {
    response.headers.set('content-type', contentType)
  }
  return response
}

/**
 * Creates a `text/plain; charset=utf-8` response.
 */
export function text(body: string, init?: ResponseInit): Response {
  return withDefaultContentType(body, 'text/plain; charset=utf-8', init)
}

/**
 * Creates a `text/html; charset=utf-8` response. The body is sent as-is.
 */
export function html(body: string, init?: ResponseInit): Response {
  return withDefaultContentType(body, 'text/html; charset=utf-8', init)
}

/**
 * Creates an `application/json` response. Throws if the value is not JSON-serializable
 * to a string (for example `undefined` or a function).
 */
export function json(data: unknown, init?: ResponseInit): Response {
  const body = JSON.stringify(data)
  if (body === undefined) {
    throw new TypeError('json() requires a JSON-serializable value')
  }
  return withDefaultContentType(body, 'application/json; charset=utf-8', init)
}

/**
 * Creates a redirect response. Defaults to 302. `location` may be relative.
 */
export function redirect(location: string, status: RedirectStatus = 302): Response {
  return new Response(null, { status, headers: { location } })
}

/**
 * Normalizes a handler or middleware result to a Response. Anything other than a
 * Response or a string is a programming error and throws.
 */
export function toResponse(value: unknown): Response {
  if (value instanceof Response) return value
  if (typeof value === 'string') return text(value)
  const received = value === null ? 'null' : typeof value
  throw new TypeError(`Handlers and middleware must return a Response or a string, received ${received}`)
}