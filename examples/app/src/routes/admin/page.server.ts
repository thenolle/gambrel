import type { Context } from '@gambrel/core'
import { redirect, type Guard, type Loader, type ParamsOf } from '@gambrel/router'

type AdminParams = ParamsOf<'/admin'>

export const beforeLoad: Guard<AdminParams, Context> = (ctx) => {
  if (ctx.context.request.headers.get('x-demo-user') === null) return redirect('/')
  return undefined
}

export const loader: Loader<AdminParams, { user: string }, Context> = (ctx) => ({
  user: ctx.context.request.headers.get('x-demo-user') ?? 'unknown'
})