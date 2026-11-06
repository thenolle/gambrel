import { serve } from '@gambrel/bun'
import { createApp, json, redirect } from '@gambrel/core'

const app = createApp({ development: true })

app.use(async (ctx, next) => {
  const started = performance.now()
  const response = await next()
  const elapsed = (performance.now() - started).toFixed(1)
  console.log(`${ctx.method} ${ctx.url.pathname} ${response.status} ${elapsed}ms`)
  return response
})

app.get('/', () => 'Gambrel is running')
app.get('/hello/:name', (ctx) => `Hello, ${ctx.params.name}`)
app.get('/api/health', () => json({ ok: true }))
app.get('/home', () => redirect('/'))

const server = serve(app, { port: 3000, development: true })

console.log(`Listening on ${server.url.href}`)