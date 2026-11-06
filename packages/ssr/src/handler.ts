import { composeRoute, createMatcher, createPayload, FRAMEWORK_ATTRIBUTE, PAYLOAD_ELEMENT_ID, resolve, RouteConfigError, serializePayload, type HookMap, type PageResolution } from '@gambrel/router'
import { escapeAttribute, renderToString } from '@gambrel/view'
import { renderDefaultError, statusText } from './error-page.tsx'
import type { DocumentHandler, DocumentHandlerOptions, ErrorInfo } from './types.ts'

interface Reply {
  readonly status: number
  readonly headers: Record<string, string>
  readonly body: string | null
}

const HTML_HEADERS = { 'content-type': 'text/html; charset=utf-8' }
const BODY_END = /<\/body>/gi

function withDoctype(html: string): string {
  return /^\s*<!doctype/i.test(html) ? html : `<!doctype html>${html}`
}

function injectBeforeBodyEnd(html: string, injection: string): string {
  let index = -1
  for (const match of html.matchAll(BODY_END)) index = match.index
  if (index === -1) throw new Error('The root layout must render a <body> element so the framework can inject the hydration scripts')
  return html.slice(0, index) + injection + html.slice(index)
}

/**
 * Creates the document request handler. Throws RouteConfigError at creation when a route
 * has no registered component, so misconfiguration fails at startup, not on first request.
 */
export function createDocumentHandler<C>(options: DocumentHandlerOptions): DocumentHandler<C> {
  const matcher = createMatcher(options.routes)
  const hooks = options.hooks as HookMap<C>
  const development = options.development ?? false
  const renderError = options.renderError ?? renderDefaultError
  for (const route of matcher.routes) {
    for (const id of [...route.layouts, route.id]) {
      if (!options.components.has(id)) throw new RouteConfigError(`No component registered for '${id}' (route '${route.pattern}')`)
    }
  }
  async function errorReply(status: number, message: string | undefined, error: unknown): Promise<Reply> {
    const info: ErrorInfo = {
      status,
      statusText: statusText(status),
      message,
      error: development ? error : undefined
    }
    try {
      const body = withDoctype(await renderToString(await renderError(info)))
      return { status, headers: HTML_HEADERS, body }
    } catch (failure) {
      console.error('[gambrel] rendering the error document failed', failure)
      return {
        status,
        headers: { 'content-type': 'text/plain; charset=utf-8' },
        body: `${status} ${info.statusText}`
      }
    }
  }
  async function documentReply(resolution: PageResolution): Promise<Reply> {
    const tree = composeRoute(resolution.chain, options.components, resolution.params)
    let body = withDoctype(await renderToString(tree))
    if (options.entry !== undefined) {
      const payload =
        `<script type="application/json" id="${PAYLOAD_ELEMENT_ID}" ${FRAMEWORK_ATTRIBUTE}="payload">` +
        `${serializePayload(createPayload(resolution))}</script>`
      const entry = `<script type="module" src="${escapeAttribute(options.entry)}" ${FRAMEWORK_ATTRIBUTE}="entry"></script>`
      body = injectBeforeBodyEnd(body, payload + entry)
    }
    return { status: 200, headers: HTML_HEADERS, body }
  }
  async function respond(request: Request, context: C): Promise<Reply> {
    const url = new URL(request.url)
    const resolution = await resolve(matcher, hooks, { pathname: url.pathname, search: url.search, context })
    switch (resolution.kind) {
      case 'page': return documentReply(resolution)
      case 'redirect': return { status: resolution.status, headers: { location: resolution.location }, body: null }
      case 'denied': return errorReply(resolution.status, resolution.message, undefined)
      case 'not-found': return errorReply(404, undefined, undefined)
      case 'bad-request': return errorReply(400, development ? resolution.reason : undefined, undefined)
      case 'error':
        console.error(`[gambrel] ${resolution.phase} of '${resolution.entryId}' failed`, resolution.error)
        return errorReply(500, undefined, resolution.error)
    }
  }
  return {
    async handle(request, context) {
      const method = request.method.toUpperCase()
      if (method !== 'GET' && method !== 'HEAD') {
        return new Response('Method Not Allowed', {
          status: 405,
          headers: { allow: 'GET, HEAD', 'content-type': 'text/plain; charset=utf-8' }
        })
      }
      let reply: Reply
      try {
        reply = await respond(request, context)
      } catch (error) {
        console.error('[gambrel] rendering failed', error)
        reply = await errorReply(500, undefined, error)
      }
      return new Response(method === 'HEAD' ? null : reply.body, { status: reply.status, headers: reply.headers })
    }
  }
}