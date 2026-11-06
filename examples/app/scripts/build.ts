import { join } from 'node:path'
import { buildApp, loadConfig } from '@gambrel/compiler'

const root = join(import.meta.dir, '..')
const result = await buildApp({ root, config: await loadConfig(root), mode: 'production' })

console.log(`Built ${result.table.routes.length} routes:`)
for (const file of result.outputs) console.log(`  ${file}`)