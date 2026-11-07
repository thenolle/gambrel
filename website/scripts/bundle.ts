import { join } from 'node:path'

export const siteRoot = join(import.meta.dir, '..')

export async function bundleApp(minify: boolean): Promise<void> {
  const result = await Bun.build({
    entrypoints: [
      join(siteRoot, 'src', 'app.ts'),
      join(siteRoot, 'src', 'icon-catalog.ts')
    ],
    outdir: join(siteRoot, 'public'),
    target: 'browser',
    format: 'esm',
    naming: '[name].[ext]',
    minify,
    sourcemap: minify ? 'none' : 'inline'
  })
  if (!result.success) throw new Error(result.logs.map((log) => log.message).join('\n'))
}