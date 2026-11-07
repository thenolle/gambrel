import { copyFile, mkdir, rm } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(import.meta.dir, '..')
const dist = join(root, 'dist')

await rm(dist, { recursive: true, force: true })
await mkdir(join(dist, 'client'), { recursive: true })

for (const [entry, target, outdir, name] of [
  ['src/client.tsx', 'browser', 'client', 'client.js'],
  ['src/server.ts', 'bun', '', 'server.js']
] as const) {
  const result = await Bun.build({
    entrypoints: [join(root, entry)],
    target,
    format: 'esm',
    outdir: join(dist, outdir),
    naming: { entry: name },
    minify: false,
    sourcemap: 'external',
    define: { 'process.env.NODE_ENV': '"production"' }
  })

  if (!result.success) {
    throw new Error(result.logs.map((log) => log.message).join('\n'))
  }
}

const stylesheet = fileURLToPath(
  import.meta.resolve('@gambrel/components/styles.css')
)
const target = join(dist, 'client', 'components.css')

await mkdir(dirname(target), { recursive: true })
await copyFile(stylesheet, target)
await copyFile(join(root, 'public', 'app.css'), join(dist, 'client', 'app.css'))

console.log('Built server, browser entry and styles')