import { describe, expect, test } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { normalizeSiteUrl, pageFile, pageUrl, rootRelativeBase, seoHead, staticLinks } from '../src/seo.ts'
import { appIcon, socialImage } from '../scripts/social-image.ts'
import { Raster } from '../scripts/raster.ts'
import { measureText, wrapText } from '../scripts/vector-type.ts'

function pngData(png: Buffer): Buffer {
  let offset = 8
  const chunks: Buffer[] = []
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const end = offset + 8 + length
    if (end + 4 > png.length) throw new Error('Invalid PNG chunk length')
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, end))
    offset = end + 4
  }
  return inflateSync(Buffer.concat(chunks))
}

describe('static documentation URLs', () => {
  const site = normalizeSiteUrl('https://example.com/gambrel')

  test('emits clean static URLs', () => {
    expect(site.href).toBe('https://example.com/gambrel/')
    expect(pageUrl('router', site)).toBe('https://example.com/gambrel/router/')
    expect(pageFile('router')).toBe('router/index.html')
    expect(rootRelativeBase('guides/forms')).toBe('../../')
  })

  test('converts legacy hash links', () => {
    expect(staticLinks('<a href="#/router@loaders">Loaders</a>')).toBe('<a href="router/#loaders">Loaders</a>')
  })

  test('rejects unsafe paths and deployment URLs', () => {
    expect(() => pageFile('../secret')).toThrow()
    expect(() => normalizeSiteUrl('javascript:alert(1)')).toThrow()
    expect(() => normalizeSiteUrl('https://example.com/#fragment')).toThrow()
  })
})

describe('metadata', () => {
  test('escapes titles and includes social metadata', () => {
    const head = seoHead({ path: 'router', title: 'Router <guide>', description: 'Typed routes & data', image: 'social/router.png?v=123' }, normalizeSiteUrl('https://example.com/docs/'))
    expect(head).toContain('href="https://example.com/docs/router/"')
    expect(head).toContain('Router &lt;guide&gt;')
    expect(head).toContain('property="og:image"')
    expect(head).toContain('name="twitter:card"')
    expect(head).toContain('application/ld+json')
    expect(head).not.toContain('#/router')
  })

  test('404 pages are not indexable', () => {
    const head = seoHead({ path: '404.html', title: 'Not found', description: 'Missing page', image: 'social/404.png', noindex: true }, normalizeSiteUrl('https://example.com/'))
    expect(head).toContain('noindex, follow')
  })
})

describe('TypeScript raster renderer', () => {
  test('rejects invalid dimensions', () => {
    expect(() => new Raster(0, 10)).toThrow()
    expect(() => new Raster(1.5, 10)).toThrow()
    expect(() => new Raster(5000, 10)).toThrow()
  })

  test('emits deterministic 1200 by 630 social PNGs', () => {
    const first = socialImage('Router', 'Typed routing and server data')
    const second = socialImage('Router', 'Typed routing and server data')
    expect(first.equals(second)).toBe(true)
    expect(first.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))).toBe(true)
    expect(first.readUInt32BE(16)).toBe(1200)
    expect(first.readUInt32BE(20)).toBe(630)
    const raw = pngData(first)
    expect(raw.length).toBe((1200 * 3 + 1) * 630)
    expect(new Set(raw).size).toBeGreaterThan(32)
  })

  test('different page titles produce different artwork', () => {
    expect(socialImage('Router').equals(socialImage('Components'))).toBe(false)
  })

  test('creates install icons in both required sizes', () => {
    for (const size of [192, 512]) {
      const png = appIcon(size)
      expect(png.readUInt32BE(16)).toBe(size)
      expect(png.readUInt32BE(20)).toBe(size)
      expect(pngData(png).length).toBe((size * 3 + 1) * size)
    }
  })

  test('wraps long words and limits title width', () => {
    const lines = wrapText('AReallyLongUnbrokenComponentNameWithManyCharacters and additional words', 52, 1000, 3)
    expect(lines.length).toBeLessThanOrEqual(3)
    for (const line of lines) expect(measureText(line, 52)).toBeLessThanOrEqual(1000)
  })
})