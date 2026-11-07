import { createHash } from 'node:crypto'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative, sep } from 'node:path'
import { appIcon } from './social-image.ts'

async function filesUnder(directory: string, root = directory): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...await filesUnder(path, root))
    else if (entry.isFile()) files.push(relative(root, path).split(sep).join('/'))
  }
  return files.sort()
}

export async function buildPwa(dist: string): Promise<void> {
  await mkdir(join(dist, 'app-icons'), { recursive: true })
  for (const size of [192, 512]) await writeFile(join(dist, 'app-icons', `icon-${size}.png`), await appIcon(size))
  await writeFile(join(dist, 'manifest.webmanifest'), JSON.stringify({
    id: './',
    name: 'Gambrel Documentation',
    short_name: 'Gambrel',
    description: 'Gambrel guides, API references, components and SVG icons.',
    lang: 'en',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#09090e',
    theme_color: '#18181b',
    prefer_related_applications: false,
    icons: [
      {
        src: 'app-icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any maskable'
      },
      {
        src: 'app-icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any maskable'
      }
    ]
  }, null, 2) + '\n', 'utf8')
  await writeFile(join(dist, 'offline.html'), `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow"><title>Offline · Gambrel</title>
<style>
body{font:16px/1.6 system-ui,sans-serif;max-width:36rem;padding:3rem 1rem;margin:auto;
background:#18181b;color:#fafafa}a{color:#c4b5fd}
</style></head><body>
<h1>This page is unavailable offline</h1>
<p>The installed documentation includes cached guides and the icon catalog.
This address is not part of that saved build.</p>
<p><a href="./">Open saved documentation</a></p>
</body></html>`, 'utf8')
  const paths = await filesUnder(dist)
  for (const path of paths.filter((file) => file.endsWith('.html'))) {
    const file = join(dist, path)
    const html = await readFile(file, 'utf8')
    const depth = path.split('/').length - 1
    const base = /<base\b/i.test(html) ? '' : `<base href="${depth === 0 ? './' : '../'.repeat(depth)}">`
    const head = [
      base,
      '<link rel="manifest" href="manifest.webmanifest">',
      '<link rel="apple-touch-icon" href="app-icons/icon-192.png">',
      '<meta name="apple-mobile-web-app-capable" content="yes">',
      '<meta name="apple-mobile-web-app-title" content="Gambrel">'
    ].join('\n')
    await writeFile(file, html.replace('</head>', `${head}\n</head>`).replace('</body>', '<script type="module" src="pwa-client.js"></script>\n</body>'), 'utf8')
  }
  const allFiles = await filesUnder(dist)
  const precache = allFiles.filter((file) => !file.startsWith('social/') && !file.endsWith('.map') && !['sw.js', '.nojekyll', 'robots.txt', 'sitemap.xml'].includes(file))
  const digest = createHash('sha256')
  for (const file of precache) {
    digest.update(file)
    digest.update(await readFile(join(dist, file)))
  }
  const version = digest.digest('hex').slice(0, 20)
  const worker = `
const VERSION = ${JSON.stringify(version)}
const FILES = ${JSON.stringify(precache)}
const ROOT = new URL('./', self.registration.scope)
const PREFIX = 'gambrel-docs:' + ROOT.pathname + ':'
const CACHE = PREFIX + VERSION
const URLS = FILES.map(file => new URL(file, ROOT).href)
const KNOWN = new Set(URLS)

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE)
    await cache.addAll(URLS)
  })())
})

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && name !== CACHE) await caches.delete(name)
    }
    await self.clients.claim()
  })())
})

self.addEventListener('message', event => {
  if (event.data?.type === 'ACTIVATE_UPDATE') self.skipWaiting()
})

self.addEventListener('fetch', event => {
  const request = event.request
  const url = new URL(request.url)
  if (request.method !== 'GET' || url.origin !== ROOT.origin ||
      !url.pathname.startsWith(ROOT.pathname)) return

  event.respondWith((async () => {
    const key = new URL(url.href)
    key.search = ''
    key.hash = ''
    if (key.pathname.endsWith('/')) key.pathname += 'index.html'

    const cache = await caches.open(CACHE)
    if (KNOWN.has(key.href)) {
      const saved = await cache.match(key.href)
      if (saved) return saved
    }

    try {
      return await fetch(request)
    } catch (error) {
      if (request.mode === 'navigate') {
        const fallback = await cache.match(new URL('offline.html', ROOT).href)
        if (fallback) return fallback
      }
      throw error
    }
  })())
})
`
  await writeFile(join(dist, 'sw.js'), worker.trim() + '\n', 'utf8')
}