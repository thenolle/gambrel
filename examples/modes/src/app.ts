import { staticFiles } from '@gambrel/bun'
import {
  createApp,
  html,
  json,
  redirect,
  text,
  type App,
  type Context
} from '@gambrel/core'
import {
  type EntryHooks
} from '@gambrel/router'
import { createDocumentHandler } from '@gambrel/ssr'
import { createElement, renderToString } from '@gambrel/view'
import { components, routes } from './manifests.ts'
import { type Mode, validateTitle } from './model.ts'
import type { TaskStore } from './store.ts'
import { CsrShell } from './ui.tsx'

export interface SiteOptions {
  readonly mode: Mode
  readonly store: TaskStore
  readonly assets: string
}

function wantsJson(ctx: Context): boolean {
  return ctx.request.headers.get('accept')?.includes('application/json') === true
}

function permittedOrigin(ctx: Context): boolean {
  const origin = ctx.request.headers.get('origin')
  return origin === null || origin === ctx.url.origin
}

function errorDocument(message: string): Promise<string> {
  return renderToString(createElement('html', {
    lang: 'en',
    children: createElement('body', {
      children: [
        createElement('h1', { children: 'The request could not be completed' }),
        createElement('p', { children: message }),
        createElement('a', { href: '/', children: 'Return to the board' })
      ]
    })
  }))
}

export function createSite(options: SiteOptions): App {
  const hooks = new Map<string, EntryHooks<never>>([
    ['layout:/', { loader: () => ({ mode: options.mode }) }],
    ['page:/', { loader: async () => ({ tasks: [...await options.store.list()] }) }]
  ])

  const documents = createDocumentHandler<Context>({
    routes,
    components,
    hooks,
    ...(options.mode === 'ssr' ? { entry: '/assets/client.js' } : {})
  })

  const failure = async (ctx: Context, status: number, message: string): Promise<Response> => {
    if (wantsJson(ctx)) return json({ error: message }, { status })
    return html(`<!doctype html>${await errorDocument(message)}`, { status })
  }

  const mutate = async (
    ctx: Context,
    action: () => Promise<boolean | void>
  ): Promise<Response> => {
    if (!permittedOrigin(ctx)) return failure(ctx, 403, 'Cross-origin changes are not allowed.')

    try {
      const result = await action()
      if (result === false) return failure(ctx, 404, 'That task no longer exists.')
      return wantsJson(ctx)
        ? json({ tasks: await options.store.list() })
        : redirect('/', 303)
    } catch (error) {
      if (error instanceof TypeError) return failure(ctx, 400, error.message)
      console.error('[example-modes] task mutation failed', error)
      return failure(ctx, 500, 'Storage is unavailable. Please try again.')
    }
  }

  const app = createApp()
    .use(staticFiles({ directory: options.assets, prefix: '/assets' }))
    .get('/api/tasks', async () => json({ tasks: await options.store.list() }))
    .post('/tasks', (ctx) => mutate(ctx, async () => {
      const data = await ctx.request.formData()
      await options.store.add(validateTitle(data.get('title')))
    }))
    .post('/tasks/:id/toggle', (ctx) => mutate(
      ctx,
      () => options.store.toggle(ctx.params.id)
    ))
    .post('/tasks/:id/delete', (ctx) => mutate(
      ctx,
      () => options.store.remove(ctx.params.id)
    ))

  if (options.mode === 'csr') {
    app.get('/', async () => html(`<!doctype html>${await renderToString(CsrShell())}`))
    app.notFound(() => text('Not Found', { status: 404 }))
  } else {
    app.notFound((ctx) => documents.handle(ctx.request, ctx))
  }

  return app
}