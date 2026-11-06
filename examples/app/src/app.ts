import { staticFiles } from '@gambrel/bun'
import { createApp, json, type App, type Context } from '@gambrel/core'
import { createDocumentHandler } from '@gambrel/ssr'
import { components, hooks, routes } from '../.gambrel/manifest.server.ts'

export interface ApplicationOptions {
  readonly development: boolean
  /**
   * URL of the browser entry script, served from `clientDir` under `/assets`.
   */
  readonly entry: string
  /**
   * Directory containing the built browser assets.
   */
  readonly clientDir: string
}

/**
 * Static assets and explicit core routes come first. Every other request falls through to
 * the document handler, which resolves file routes, renders and answers 404 for the rest.
 */
export function createApplication(options: ApplicationOptions): App {
  const documents = createDocumentHandler<Context>({ routes, components, hooks, entry: options.entry, development: options.development })
  return createApp({ development: options.development }).use(staticFiles({ directory: options.clientDir, prefix: '/assets' })).get('/api/health', () => json({ ok: true })).notFound((ctx) => documents.handle(ctx.request, ctx))
}