import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { bundleApp, siteRoot } from './bundle.ts'
import { docsRoot } from './serve.ts'
import { writeIconCatalog } from './catalog.ts'
import { defaultSiteUrl, prerender } from './prerender.ts'

const dist = join(siteRoot, 'dist')

await bundleApp(true)
await writeIconCatalog()
await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(join(siteRoot, 'public'), dist, { recursive: true })
await cp(docsRoot, join(dist, 'docs'), { recursive: true })
await writeFile(join(dist, '.nojekyll'), '', 'utf8')
await prerender(dist, docsRoot, process.env['DOCS_SITE_URL'] ?? defaultSiteUrl)

console.log(`Static documentation site written to ${dist}`)