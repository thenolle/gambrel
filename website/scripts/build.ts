import { cp, mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { bundleApp, siteRoot } from './bundle.ts'
import { docsRoot } from './serve.ts'

const dist = join(siteRoot, 'dist')

await bundleApp(true)
await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })
await cp(join(siteRoot, 'public'), dist, { recursive: true })
await cp(docsRoot, join(dist, 'docs'), { recursive: true })
await writeFile(join(dist, '.nojekyll'), '', 'utf8')

console.log(`Static documentation site written to ${dist}`)