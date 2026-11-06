export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS'

export type Params = Readonly<Record<string, string>>

/**
 * Extracts typed path parameters from a route path literal.
 * `'/users/:id/posts/:postId'` becomes `{ id: string } & { postId: string }`.
 */
export type ParamsOf<P extends string> = P extends `${string}:${infer Name}/${infer Rest}` ? { readonly [K in Name]: string } & ParamsOf<`/${Rest}`> : P extends `${string}:${infer Name}` ? { readonly [K in Name]: string } : Record<never, never>

/**
 * Per-request context. `params` are already percent-decoded.
 */
export interface Context<P = Params> {
  readonly request: Request
  readonly url: URL
  readonly method: string
  readonly params: Readonly<P>
}

/**
 * What a handler may return. A string becomes a `text/plain` 200 response.
 */
export type Result = Response | string

export type Handler<P = Params> = (ctx: Context<P>) => Result | Promise<Result>

export type Next = () => Promise<Response>

export type Middleware = (ctx: Context, next: Next) => Result | Promise<Result>

export type ErrorHandler = (error: unknown, ctx: Context) => Result | Promise<Result>

export interface AppOptions {
  /**
   * When true, the default error handler includes the error stack in 500 responses.
   * Defaults to false.
   */
  readonly development?: boolean
}

export interface App {
  route<P extends string>(method: HttpMethod, path: P, handler: Handler<ParamsOf<P>>): App
  get<P extends string>(path: P, handler: Handler<ParamsOf<P>>): App
  post<P extends string>(path: P, handler: Handler<ParamsOf<P>>): App
  put<P extends string>(path: P, handler: Handler<ParamsOf<P>>): App
  patch<P extends string>(path: P, handler: Handler<ParamsOf<P>>): App
  delete<P extends string>(path: P, handler: Handler<ParamsOf<P>>): App
  options<P extends string>(path: P, handler: Handler<ParamsOf<P>>): App
  use(middleware: Middleware): App
  notFound(handler: Handler): App
  onError(handler: ErrorHandler): App
  fetch(request: Request): Promise<Response>
}