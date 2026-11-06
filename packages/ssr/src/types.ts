import type { AnyRouteComponent, HookMap, RouteRecord } from '@gambrel/router'
import type { Child } from '@gambrel/view'

export interface ErrorInfo {
  readonly status: number
  readonly statusText: string
  /**
   * Safe to show: set for denials and, in development, for bad requests.
   */
  readonly message: string | undefined
  /**
   * The underlying error. Only set when `development` is true.
   */
  readonly error: unknown
}

export interface DocumentHandlerOptions {
  readonly routes: readonly RouteRecord[]
  readonly components: ReadonlyMap<string, AnyRouteComponent>
  readonly hooks: HookMap<never>
  /**
   * URL of the browser entry script. When omitted, pages are rendered without a
   * hydration payload or scripts.
   */
  readonly entry?: string | undefined
  /**
   * Shows error details in error documents. Defaults to false.
   */
  readonly development?: boolean | undefined
  /**
   * Renders the document for 400, 403, 404 and 500 responses. It must return a complete
   * document; error documents are never hydrated.
   */
  readonly renderError?: ((info: ErrorInfo) => Child | Promise<Child>) | undefined
}

export interface DocumentHandler<C> {
  /**
   * Handles a GET or HEAD request for a document. `context` is passed to loaders and guards.
   */
  handle(request: Request, context: C): Promise<Response>
}