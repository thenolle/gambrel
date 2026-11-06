import { compilePath, compareSpecificity, matchSegments, shapeKey, splitPath, type Entry } from './matcher.ts'
import { text, toResponse } from './response.ts'
import type { App, AppOptions, Context, ErrorHandler, Handler, HttpMethod, Middleware, ParamsOf } from './types.ts'

type Resolution =
  | { readonly kind: 'route'; readonly handler: Handler; readonly params: Record<string, string> }
  | { readonly kind: 'method-not-allowed'; readonly allow: readonly string[] }
  | { readonly kind: 'malformed' }
  | { readonly kind: 'not-found' }

function describe(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}

function resolve(entries: readonly Entry<Handler>[], method: string, parts: readonly string[]): Resolution {
  let best: { readonly entry: Entry<Handler>; readonly params: Record<string, string> } | undefined
  const allowed = new Set<string>()
  for (const entry of entries) {
    const params = matchSegments(entry.segments, parts)
    if (params === null) continue
    if (entry.method !== method) {
      allowed.add(entry.method)
      continue
    }
    if (best === undefined || compareSpecificity(entry.segments, best.entry.segments) < 0) best = { entry, params }
  }
  if (best !== undefined) return { kind: 'route', handler: best.entry.value, params: best.params }
  if (allowed.size > 0) return { kind: 'method-not-allowed', allow: [...allowed].sort() }
  return { kind: 'not-found' }
}

/**
 * Creates a server application. The returned `fetch` is the only server interface:
 * runtime adapters call it with a standard `Request` and send the returned `Response`.
 */
export function createApp(options: AppOptions = {}): App {
  const development = options.development ?? false
  const entries: Entry<Handler>[] = []
  const keys = new Set<string>()
  const middleware: Middleware[] = []
  let notFoundHandler: Handler = () => text('Not Found', { status: 404 })
  let errorHandler: ErrorHandler = (error) => {
    console.error(error)
    return text(development ? describe(error) : 'Internal Server Error', { status: 500 })
  }
  const register = <P extends string>(method: HttpMethod, path: P, handler: Handler<ParamsOf<P>>): App => {
    const segments = compilePath(path)
    const key = `${method} ${shapeKey(segments)}`
    if (keys.has(key)) throw new Error(`Duplicate route: ${method} ${path}`)
    keys.add(key)
    entries.push({ method, path, segments, value: handler as unknown as Handler })
    return app
  }
  const handle = async (request: Request): Promise<Response> => {
    const url = new URL(request.url)
    const method = request.method.toUpperCase()
    let resolution: Resolution
    try {
      const parts = splitPath(url.pathname).map((part) => decodeURIComponent(part))
      resolution = resolve(entries, method, parts)
    } catch (error) {
      if (!(error instanceof URIError)) throw error
      resolution = { kind: 'malformed' }
    }
    const ctx: Context = { request, url, method, params: resolution.kind === 'route' ? resolution.params : {} }
    const terminal = async (): Promise<Response> => {
      switch (resolution.kind) {
        case 'route': return toResponse(await resolution.handler(ctx))
        case 'malformed': return text('Bad Request', { status: 400 })
        case 'method-not-allowed': return text('Method Not Allowed', { status: 405, headers: { allow: resolution.allow.join(', ') } })
        case 'not-found': return toResponse(await notFoundHandler(ctx))
      }
    }
    const dispatch = async (index: number): Promise<Response> => {
      const current = middleware[index]
      if (current === undefined) return terminal()
      let called = false
      return toResponse(
        await current(ctx, () => {
          if (called) throw new Error('next() was called more than once')
          called = true
          return dispatch(index + 1)
        })
      )
    }
    try {
      return await dispatch(0)
    } catch (error) {
      try {
        return toResponse(await errorHandler(error, ctx))
      } catch (handlerError) {
        console.error(handlerError)
        return text('Internal Server Error', { status: 500 })
      }
    }
  }
  const app: App = {
    route: register,
    get: (path, handler) => register('GET', path, handler),
    post: (path, handler) => register('POST', path, handler),
    put: (path, handler) => register('PUT', path, handler),
    patch: (path, handler) => register('PATCH', path, handler),
    delete: (path, handler) => register('DELETE', path, handler),
    options: (path, handler) => register('OPTIONS', path, handler),
    use: (fn) => {
      middleware.push(fn)
      return app
    },
    notFound: (handler) => {
      notFoundHandler = handler
      return app
    },
    onError: (handler) => {
      errorHandler = handler
      return app
    },
    fetch: handle
  }
  return app
}