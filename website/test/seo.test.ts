import { describe, expect, test } from 'bun:test'
import { inflateSync } from 'node:zlib'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { normalizeSiteUrl, pageFile, pageUrl, rootRelativeBase, seoHead, staticLinks } from '../src/seo.ts'
import { appIcon, fonts, socialImage } from '../scripts/social-image.ts'
import { Raster } from '../scripts/raster.ts'
import { TrueTypeFont, wrapFontText } from '../scripts/true-type.ts'

function pngData(png: Buffer): Buffer {
  let offset = 8
  const chunks: Buffer[] = []
  while (offset + 12 <= png.length) {
    const length = png.readUInt32BE(offset)
    const type = png.toString('ascii', offset + 4, offset + 8)
    const end = offset + 8 + length
    if (end + 4 > png.length) throw new Error('Invalid PNG chunk')
    if (type === 'IDAT') chunks.push(png.subarray(offset + 8, end))
    offset = end + 4
  }
  return inflateSync(Buffer.concat(chunks))
}

describe('static URLs', () => {
  const site = normalizeSiteUrl('https://example.com/gambrel')

  test('uses clean static paths', () => {
    expect(pageUrl('router', site)).toBe('https://example.com/gambrel/router/')
    expect(pageFile('router')).toBe('router/index.html')
    expect(rootRelativeBase('guides/forms')).toBe('../../')
    expect(staticLinks('<a href="#/router@loaders">x</a>')).toBe('<a href="router/#loaders">x</a>')
  })

  test('rejects invalid input', () => {
    expect(() => pageFile('../secret')).toThrow()
    expect(() => normalizeSiteUrl('javascript:alert(1)')).toThrow()
  })
})

test('metadata includes canonical and sharing data', () => {
  const head = seoHead({ path: 'router', title: 'Router <guide>', description: 'Typed routes', image: 'social/router.png?v=1' }, normalizeSiteUrl('https://example.com/'))
  expect(head).toContain('rel="canonical"')
  expect(head).toContain('Router &lt;guide&gt;')
  expect(head).toContain('property="og:image"')
  expect(head).toContain('name="twitter:card"')
})

describe('font rendering', () => {
  test('reads the committed static TrueType font', () => {
    const font = new TrueTypeFont(readFileSync(join(import.meta.dir, '..', 'assets', 'fonts', 'AtkinsonHyperlegible-Regular.ttf')))
    expect(font.measure('Documentation', 24)).toBeGreaterThan(0)
    expect(font.measure('Wide', 48)).toBeGreaterThan(font.measure('Wide', 24))
  })

  test('wraps without exceeding the available width', () => {
    const font = fonts().bold
    const lines = wrapFontText(font, 'Server rendering and application configuration', 60, 900, 3)
    expect(lines.length).toBeLessThanOrEqual(3)
    for (const line of lines) expect(font.measure(line, 60)).toBeLessThanOrEqual(900)
  })

  test('renders ordinary and composite glyphs', () => {
    const canvas = new Raster(400, 120)
    canvas.background(() => [255, 255, 255])
    fonts().regular.draw(canvas, 'Gambrel · café', 12, 80, 40, [0, 0, 0])
    const raw = pngData(canvas.png())
    expect(new Set(raw).size).toBeGreaterThan(16)
  })
})

describe('artwork', () => {
  test('produces deterministic 1200×630 PNGs', () => {
    const first = socialImage('Routing and layouts', 'Typed routes and nested documents.')
    const second = socialImage('Routing and layouts', 'Typed routes and nested documents.')
    expect(first.equals(second)).toBe(true)
    expect(first.readUInt32BE(16)).toBe(1200)
    expect(first.readUInt32BE(20)).toBe(630)
    expect(pngData(first).length).toBe((1200 * 3 + 1) * 630)
  })

  test('produces real application icons', () => {
    for (const size of [192, 512]) {
      const png = appIcon(size)
      expect(png.readUInt32BE(16)).toBe(size)
      expect(png.readUInt32BE(20)).toBe(size)
    }
  })
})