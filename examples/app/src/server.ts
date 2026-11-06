import { resolve } from 'node:path'
import { serve } from '@gambrel/bun'
import { createApplication } from './app.ts'

const development = process.env['NODE_ENV'] !== 'production'
const port = Number(process.env['PORT'] ?? 3000)
if (!Number.isInteger(port)) throw new Error(`PORT must be an integer, received '${process.env['PORT']}'`)

const clientDir = resolve(process.env['GAMBREL_CLIENT_DIR'] ?? 'dist/client')
const app = createApplication({ development, entry: '/assets/client.js', clientDir })
const server = serve(app, { port, development })

console.log(`Listening on ${server.url.href} (assets from ${clientDir})`)