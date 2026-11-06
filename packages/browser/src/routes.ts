import { composeRoute, createMatcher, HydrationPayloadError, parsePayload, PAYLOAD_ELEMENT_ID, verifyPayload, type AnyRouteComponent, type RouteRecord } from '@gambrel/router'
import { hydrate, type HydratedRoot, type HydrateOptions } from './roots.ts'

export interface HydrateRoutesOptions {
  /**
   * The client route table, from the generated client manifest.
   */
  readonly routes: readonly RouteRecord[]
  /**
   * Route components by entry id, from the generated client manifest.
   */
  readonly components: ReadonlyMap<string, AnyRouteComponent>
  /**
   * Defaults to the global `document`, read only when this function is called.
   */
  readonly document?: Document | undefined
  /**
   * Defaults to `document.location.pathname`.
   */
  readonly pathname?: string | undefined
  readonly onMismatch?: HydrateOptions['onMismatch']
}

function currentDocument(): Document {
  if (typeof document === 'undefined') {
    throw new Error('hydrateRoutes() needs a browser document; call it from the client entry')
  }
  return document
}

/**
 * Hydrates a server-rendered document: reads and validates the embedded payload, checks it
 * against the client route table, rebuilds the same component tree from the payload's
 * params and per-entry data, and hydrates the existing markup. Loaders and guards never run.
 *
 * Throws HydrationPayloadError when the payload is missing, malformed, unsupported or
 * inconsistent with the page. The server-rendered HTML is left untouched in that case.
 */
export function hydrateRoutes(options: HydrateRoutesOptions): HydratedRoot {
  const doc = options.document ?? currentDocument()
  const element = doc.getElementById(PAYLOAD_ELEMENT_ID)
  if (element === null || element.getAttribute('type') !== 'application/json') throw new HydrationPayloadError(`Hydration payload element #${PAYLOAD_ELEMENT_ID} not found`)
  const payload = parsePayload(element.textContent ?? '')
  const matcher = createMatcher(options.routes)
  verifyPayload(payload, matcher, options.pathname ?? doc.location.pathname)
  const tree = composeRoute(payload.chain, options.components, payload.params)
  return hydrate(doc, tree, options.onMismatch === undefined ? {} : { onMismatch: options.onMismatch })
}