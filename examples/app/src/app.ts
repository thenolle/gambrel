import { createApp, json, type App, type Context } from '@gambrel/core'
import { createDocumentHandler } from '@gambrel/ssr'
import { components, hooks, routes } from '../.gambrel/manifest.server.ts'

export interface ApplicationOptions {
  readonly development: boolean
  readonly entry: string
}

/**
 * Explicit core routes (the API) take precedence. Every other request falls through to
 * the document handler, which resolves file routes, renders and answers 404 for the rest.
 */
export function createApplication(options: ApplicationOptions): App {
  const documents = createDocumentHandler<Context>({
    routes,
    components,
    hooks,
    entry: options.entry,
    development: options.development
  })
  return createApp({ development: options.development })
    .get('/api/health', () => json({ ok: true }))
    .notFound((ctx) => documents.handle(ctx.request, ctx))
}