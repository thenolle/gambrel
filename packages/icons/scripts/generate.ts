import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { generateModules, readIconDirectory } from './lib.ts'

const root = join(import.meta.dir, '..')
const output = join(root, 'src', 'generated')

async function readIfExists(path: string): Promise<string | undefined> {
  try {
    return await readFile(path, 'utf8')
  } catch {
    return undefined
  }
}

const entries = await readIconDirectory(join(root, 'svg'))
const modules = generateModules(entries)
await mkdir(output, { recursive: true })

let written = 0
for (const [file, content] of Object.entries(modules)) {
  const path = join(output, file)
  if ((await readIfExists(path)) === content) continue
  await writeFile(path, content, 'utf8')
  written += 1
}

console.log(`${entries.length} icons, ${written} generated files updated`)