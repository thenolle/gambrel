import { join } from 'node:path'

export const siteRoot = join(import.meta.dir, '..')

/**
 * Bundles `src/app.ts` into `public/app.js`, the only generated file of the site.
 */
export async function bundleApp(minify: boolean): Promise<void> {
  const result = await Bun.build({
    entrypoints: [join(siteRoot, 'src', 'app.ts')],
    outdir: join(siteRoot, 'public'),
    target: 'browser',
    format: 'esm',
    naming: '[name].[ext]',
    minify,
    sourcemap: minify ? 'none' : 'inline'
  })
  if (!result.success) {
    throw new Error(result.logs.map((log) => log.message).join('\n'))
  }
}