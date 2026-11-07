import { resolve } from 'node:path'
import { serve } from '@gambrel/bun'
import { createSite } from './app.ts'
import { parseMode } from './model.ts'
import { createFileStore } from './store.ts'

const mode = parseMode(process.argv[2])
const ports = { ssr: 3101, csr: 3102, server: 3103 } as const
const port = Number(process.env['PORT'] ?? ports[mode])

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new RangeError('PORT must be an integer between 0 and 65535')
}

const assets = resolve(import.meta.dir, 'client')
const file = resolve(process.env['TASKS_FILE'] ?? `.data/${mode}.json`)
const store = createFileStore(file)
const server = serve(createSite({ mode, store, assets }), { port })

console.log(`${mode}: ${server.url.href}`)
console.log(`Task storage: ${file}`)