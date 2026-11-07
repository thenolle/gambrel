import { describe, expect, test } from 'bun:test'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const siteRoot = join(import.meta.dir, '..')
const dist = join(siteRoot, 'dist')

describe('the static site', () => {
  test('the shell only uses relative URLs, so it works under a sub-path like /gambrel/', async () => {
    const html = await readFile(join(siteRoot, 'public', 'index.html'), 'utf8')
    const absolute = [...html.matchAll(/\b(?:src|href)="(\/[^"]*)"/g)].map((match) => match[1])
    expect(absolute).toEqual([])
  })

  test('the build emits a complete, self-contained folder', async () => {
    const child = Bun.spawn([process.execPath, join(siteRoot, 'scripts', 'build.ts')], { stdout: 'ignore', stderr: 'inherit' })
    expect(await child.exited).toBe(0)

    const manifest = JSON.parse(await readFile(join(dist, 'manifest.webmanifest'), 'utf8')) as { display: string, start_url: string, scope: string, icons: Array<{ src: string; sizes: string }> }

    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('./')
    expect(manifest.scope).toBe('./')
    expect(manifest.icons.map((icon) => icon.sizes)).toEqual(['192x192', '512x512'])

    for (const icon of manifest.icons) {
      const png = await readFile(join(dist, icon.src))
      const size = Number(icon.sizes.split('x')[0])
      expect(png.readUInt32BE(16)).toBe(size)
      expect(png.readUInt32BE(20)).toBe(size)
    }

    const worker = await readFile(join(dist, 'sw.js'), 'utf8')
    expect(worker).toContain('ACTIVATE_UPDATE')
    expect(worker).toContain('offline.html')
    expect(worker).toContain('gambrel-docs:')

    const generated = await readFile(join(dist, 'router', 'index.html'), 'utf8')
    expect(generated).toContain('rel="manifest"')
    expect(generated).toContain('src="pwa-client.js"')
    expect(generated).toContain('social/router.png?v=')

    const router = await readFile(join(dist, 'router', 'index.html'), 'utf8')
    expect(router).toContain('rel="canonical"')
    expect(router).toContain('property="og:title"')
    expect(router).toContain('name="description"')
    expect(router).toContain('<article class="doc">')
    expect(router).toContain('<h1')
    expect(router).not.toContain('Loading documentation...')

    const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8')
    expect(sitemap).toContain('/router/</loc>')
    expect(sitemap).not.toContain('#/')
    expect(sitemap).not.toContain('404.html')

    const missing = await readFile(join(dist, '404.html'), 'utf8')
    expect(missing).toContain('noindex, follow')

    expect((await stat(join(dist, 'social', 'router.png'))).isFile()).toBe(true)

    for (const file of [
      'index.html',
      'styles.css',
      'app.js',
      'icons.html',
      'icons.css',
      'icon-catalog.js',
      'icons.json',
      'gambrel.svg',
      'favicon.svg',
      '.nojekyll',
      'docs/nav.json',
      'docs/introduction.md'
    ]) {
      expect((await stat(join(dist, file))).isFile(), file).toBe(true)
    }

    const bundle = await readFile(join(dist, 'app.js'), 'utf8')
    expect(bundle.length).toBeGreaterThan(1000)
    expect(bundle).not.toContain('sourceMappingURL=data:')

    const entries = await readdir(join(dist, 'docs'))
    expect(entries.filter((entry) => entry.endsWith('.md')).length).toBeGreaterThan(20)
  }, 300_000)
})