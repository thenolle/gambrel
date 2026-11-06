import type { Child } from '@gambrel/view'

export type JsonPrimitive = string | number | boolean | null
export type JsonValue = JsonPrimitive | readonly JsonValue[] | { readonly [key: string]: JsonValue }
export type RedirectStatus = 301 | 302 | 303 | 307 | 308
export type RouteParamValue = string | readonly string[]
export type RouteParams = Readonly<Record<string, RouteParamValue>>

/**
 * Typed params from a route pattern literal. `[id]` is a string, `[...slug]` is a
 * readonly string array.
 * `ParamsOf<'/users/[id]/files/[...path]'>` is `{ id: string } & { path: readonly string[] }`.
 */
export type ParamsOf<P extends string> = P extends `${string}[${infer Inner}]${infer Rest}` ? (Inner extends `...${infer Name}` ? { readonly [K in Name]: readonly string[] } : { readonly [K in Inner]: string }) & ParamsOf<Rest> : Record<never, never>

/**
 * Client-safe description of one page route. `id` and every entry of `layouts` are
 * opaque, stable identifiers. `layouts` lists layout IDs from outermost to innermost.
 */
export interface RouteRecord {
  readonly id: string
  readonly pattern: string
  readonly layouts: readonly string[]
}

export interface PageProps<P = RouteParams, D = JsonValue> {
  readonly params: Readonly<P>
  readonly data: D
}

export interface LayoutProps<P = RouteParams, D = JsonValue> extends PageProps<P, D> {
  readonly children: Child
}

/**
 * The single component contract for pages and layouts. Route components are
 * synchronous so that the same component can render on the server and hydrate in
 * the browser.
 */
export type PageComponent<P = RouteParams, D = JsonValue> = (props: PageProps<P, D>) => Child
export type LayoutComponent<P = RouteParams, D = JsonValue> = (props: LayoutProps<P, D>) => Child

export interface RedirectOutcome {
  readonly $$outcome: 'redirect'
  readonly location: string
  readonly status: RedirectStatus
}

export interface DenyOutcome {
  readonly $$outcome: 'deny'
  readonly status: number
  readonly message: string | undefined
}

export interface NotFoundOutcome {
  readonly $$outcome: 'not-found'
}

export type Outcome = RedirectOutcome | DenyOutcome | NotFoundOutcome

export interface HookContext<P = RouteParams, C = unknown> {
  readonly params: Readonly<P>
  readonly pathname: string
  readonly search: string
  readonly context: C
}

/**
 * A guard returns nothing to continue, or an outcome to stop the request.
 */
export type GuardResult = void | Outcome
export type Guard<P = RouteParams, C = unknown> = (ctx: HookContext<P, C>) => GuardResult | Promise<GuardResult>
export type LoaderResult<D> = D | Outcome

/**
 * A loader returns JSON data (use `null` for none), or an outcome to stop the request.
 */
export type Loader<P = RouteParams, D extends JsonValue = JsonValue, C = unknown> = (ctx: HookContext<P, C>) => LoaderResult<D> | Promise<LoaderResult<D>>

/**
 * The data type a loader produces: `LoaderData<typeof loader>`.
 */
export type LoaderData<L> = L extends (...args: never[]) => infer R ? Exclude<Awaited<R>, Outcome> : never

/**
 * Server-only hooks for one entry (layout or page), stored with a `never` params type
 * so that hooks typed with specific params are accepted.
 */
export interface EntryHooks<C = unknown> {
  readonly guard?: Guard<never, C> | undefined
  readonly loader?: Loader<never, JsonValue, C> | undefined
}

export type HookMap<C = unknown> = ReadonlyMap<string, EntryHooks<C>>

export interface ChainEntry {
  readonly id: string
  readonly kind: 'layout' | 'page'
  readonly data: JsonValue
}

export type Resolution =
  | {
    readonly kind: 'page'
    readonly route: RouteRecord
    readonly pathname: string
    readonly params: RouteParams
    readonly chain: readonly ChainEntry[]
  }
  | { readonly kind: 'redirect'; readonly location: string; readonly status: RedirectStatus }
  | { readonly kind: 'denied'; readonly status: number; readonly message: string | undefined }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'bad-request'; readonly reason: string }
  | {
    readonly kind: 'error'
    readonly error: unknown
    readonly entryId: string
    readonly phase: 'guard' | 'loader'
  }

export interface ResolveInput<C = unknown> {
  readonly pathname: string
  readonly search?: string | undefined
  readonly context: C
}