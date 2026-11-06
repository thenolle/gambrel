import { join } from 'node:path'
import { serve, staticFiles } from '@gambrel/bun'
import { createApp, type App } from '@gambrel/core'
import { bundleApp, siteRoot } from './bundle.ts'

export const docsRoot = join(siteRoot, '..', 'docs')
const publicDir = join(siteRoot, 'public')

/**
 * The documentation server: the site shell at `/`, the Markdown sources under `/docs`,
 * and the site's own assets. Built from Gambrel's own core and static-file middleware.
 */
export function createSiteApp(): App {
  return createApp()
    .use(async (ctx, next) => {
      if (ctx.url.pathname !== '/' || (ctx.method !== 'GET' && ctx.method !== 'HEAD')) return next()
      return new Response(ctx.method === 'HEAD' ? null : Bun.file(join(publicDir, 'index.html')), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-cache' }
      })
    })
    .use(staticFiles({ directory: docsRoot, prefix: '/docs' }))
    .use(staticFiles({ directory: publicDir, prefix: '/' }))
}

if (import.meta.main) {
  await bundleApp(false)
  const port = Number(process.env['DOCS_PORT'] ?? 4000)
  const server = serve(createSiteApp(), { port, development: true })
  console.log(`Documentation at ${server.url.href}`)
}