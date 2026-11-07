import { describe, expect, test } from 'bun:test'
import {
  normalizeSiteUrl,
  pageFile,
  pageUrl,
  rootRelativeBase,
  seoHead,
  staticLinks
} from '../src/seo.ts'
import { socialImage } from '../scripts/social-image.ts'

describe('static documentation URLs', () => {
  const site = normalizeSiteUrl('https://example.com/gambrel')

  test('normalizes deployment roots and emits clean page URLs', () => {
    expect(site.href).toBe('https://example.com/gambrel/')
    expect(pageUrl('router', site)).toBe('https://example.com/gambrel/router/')
    expect(pageFile('router')).toBe('router/index.html')
    expect(rootRelativeBase('guides/forms')).toBe('../../')
  })

  test('converts legacy links without fragments as page identities', () => {
    expect(staticLinks('<a href="#/router@loaders">Loaders</a>')).toBe(
      '<a href="router/#loaders">Loaders</a>'
    )
    expect(staticLinks('<a href="#/">Home</a>')).toBe(
      '<a href="./">Home</a>'
    )
  })

  test('rejects unsafe deployment URLs and paths', () => {
    expect(() => normalizeSiteUrl('javascript:alert(1)')).toThrow()
    expect(() => normalizeSiteUrl('https://example.com/#x')).toThrow()
    expect(() => pageFile('../secret')).toThrow()
  })
})

describe('metadata', () => {
  test('writes canonical, Open Graph, social and structured data safely', () => {
    const head = seoHead({
      path: 'router',
      title: 'Router <guide>',
      description: 'Typed routes & data',
      image: 'social/router.png'
    }, normalizeSiteUrl('https://example.com/docs/'))

    expect(head).toContain('href="https://example.com/docs/router/"')
    expect(head).toContain('property="og:url"')
    expect(head).toContain('property="og:image"')
    expect(head).toContain('name="twitter:card" content="summary_large_image"')
    expect(head).toContain('application/ld+json')
    expect(head).toContain('Router &lt;guide&gt;')
    expect(head).not.toContain('#/router')
  })

  test('404 metadata prevents indexing', () => {
    const head = seoHead({
      path: '404.html',
      title: 'Not found',
      description: 'Missing page',
      image: 'social/404.png',
      noindex: true
    }, normalizeSiteUrl('https://example.com/'))

    expect(head).toContain('content="noindex, follow"')
  })
})

test('social images are deterministic 1200 by 630 PNGs', () => {
  const first = socialImage('Router')
  const second = socialImage('Router')

  expect(first.equals(second)).toBe(true)
  expect(first.subarray(0, 8).equals(
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  )).toBe(true)
  expect(first.readUInt32BE(16)).toBe(1200)
  expect(first.readUInt32BE(20)).toBe(630)
})