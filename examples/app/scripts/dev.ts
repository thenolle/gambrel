import { watch } from 'node:fs'
import { join } from 'node:path'
import { buildClient, loadConfig } from '@gambrel/compiler'

const root = join(import.meta.dir, '..')
const config = await loadConfig(root)

async function rebuild(): Promise<void> {
  try {
    const result = await buildClient({ root, config, mode: 'development' })
    console.log(`[gambrel] client rebuilt (${result.outputs.length} files); reload the page`)
  } catch (error) {
    console.error('[gambrel] client build failed', error)
  }
}

await rebuild()

let timer: ReturnType<typeof setTimeout> | undefined
watch(join(root, 'src'), { recursive: true }, () => {
  clearTimeout(timer)
  timer = setTimeout(() => void rebuild(), 100)
})

await import('../src/server.ts')