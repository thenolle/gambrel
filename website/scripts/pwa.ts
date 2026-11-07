import { createHash } from 'node:crypto'
import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises'
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
  for (const size of [192, 512]) await writeFile(join(dist, 'app-icons', `icon-${size}.png`), appIcon(size))
  const icons = [192, 512].map((size) => ({ src: `app-icons/icon-${size}.png`, sizes: `${size}x${size}`, type: 'image/png', purpose: 'any maskable' }))
  await writeFile(join(dist, 'manifest.webmanifest'), JSON.stringify({
    id: './',
    name: 'Gambrel',
    short_name: 'Gambrel',
    description: 'Documentation, component references and icons.',
    lang: 'en',
    start_url: './',
    scope: './',
    display: 'standalone',
    background_color: '#f9f9f7',
    theme_color: '#18181f',
    categories: ['education', 'developer tools'],
    icons,
    shortcuts: [
      { name: 'Getting started', url: './getting-started/' },
      { name: 'Icon catalog', url: './icons.html' }
    ]
  }, null, 2) + '\n', 'utf8')
  await writeFile(join(dist, 'offline.html'), `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,follow">
<title>Offline · Gambrel</title>
<style>
body{font:16px/1.6 system-ui,sans-serif;max-width:34rem;padding:4rem 1.5rem;margin:auto;
background:#f9f9f7;color:#202124}a{color:inherit}
</style></head><body>
<h1>This page isn't saved</h1>
<p>Your saved documentation is still available. Reconnect to open this address.</p>
<a href="./">Open documentation</a>
</body></html>`, 'utf8')
  const paths = await filesUnder(dist)
  for (const path of paths.filter((file) => file.endsWith('.html'))) {
    const file = join(dist, path)
    let html = await readFile(file, 'utf8')
    const depth = path.split('/').length - 1
    if (!/<base\b/i.test(html)) html = html.replace('<head>', `<head><base href="${depth === 0 ? './' : '../'.repeat(depth)}">`)
    const tags = [
      '<link rel="manifest" href="manifest.webmanifest">',
      '<link rel="apple-touch-icon" href="app-icons/icon-192.png">',
      '<link rel="stylesheet" href="pwa.css">',
      '<meta name="apple-mobile-web-app-title" content="Gambrel">'
    ].join('\n')
    html = html.replace('</head>', `${tags}\n</head>`).replace('</body>', '<script type="module" src="pwa-client.js"></script>\n</body>')
    await writeFile(file, html, 'utf8')
  }
  await mkdir(join(dist, 'licenses'), { recursive: true })
  await cp(join(import.meta.dir, '..', 'assets', 'fonts', 'OFL.txt'), join(dist, 'licenses', 'atkinson-hyperlegible.txt'))
  const allFiles = await filesUnder(dist)
  const precache = allFiles.filter((file) => !file.startsWith('social/') && !file.endsWith('.map') && !['sw.js', '.nojekyll', 'robots.txt', 'sitemap.xml'].includes(file))
  const hash = createHash('sha256')
  for (const file of precache) {
    hash.update(file)
    hash.update(await readFile(join(dist, file)))
  }
  const version = hash.digest('hex').slice(0, 20)
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