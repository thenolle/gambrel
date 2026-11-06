import { expect, test } from 'bun:test'
import { createApp, json, redirect } from '@gambrel/core'
import { serve } from '../src/index.ts'

test('serves requests through Bun.serve', async () => {
  const app = createApp().get('/hello/:name', (ctx) => json({ hello: ctx.params.name })).get('/old', () => redirect('/hello/world', 301))
  const server = serve(app, { port: 0, hostname: '127.0.0.1' })
  try {
    const ok = await fetch(new URL('/hello/world', server.url))
    expect(ok.status).toBe(200)
    expect(await ok.json()).toEqual({ hello: 'world' })
    const moved = await fetch(new URL('/old', server.url), { redirect: 'manual' })
    expect(moved.status).toBe(301)
    expect(moved.headers.get('location')).toBe('/hello/world')
    const missing = await fetch(new URL('/missing', server.url))
    expect(missing.status).toBe(404)
  } finally {
    await server.stop(true)
  }
})