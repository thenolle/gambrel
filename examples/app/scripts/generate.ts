import { join } from 'node:path'
import { generateRoutes } from '@gambrel/compiler'

const result = await generateRoutes({ root: join(import.meta.dir, '..') })

console.log(`Generated ${result.table.routes.length} routes (${result.written.length} files updated)`)