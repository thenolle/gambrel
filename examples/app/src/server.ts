import { serve } from '@gambrel/bun'
import { createApplication } from './app.ts'

const development = process.env['NODE_ENV'] !== 'production'
const port = Number(process.env['PORT'] ?? 3000)
if (!Number.isInteger(port)) throw new Error(`PORT must be an integer, received '${process.env['PORT']}'`)

const app = createApplication({ development, entry: '/assets/client.js' })
const server = serve(app, { port, development })

console.log(`Listening on ${server.url.href}`)