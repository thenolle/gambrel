import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildIconCatalog } from '../../packages/icons/scripts/catalog.ts'
import { siteRoot } from './bundle.ts'

export async function writeIconCatalog(): Promise<void> {
  const catalog = await buildIconCatalog()
  const directory = join(siteRoot, 'public')
  await mkdir(directory, { recursive: true })
  await writeFile(join(directory, 'icons.json'), `${JSON.stringify(catalog, null, 2)}\n`, 'utf8')
}

if (import.meta.main) await writeIconCatalog()