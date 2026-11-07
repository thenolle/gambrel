import { describe, expect, test } from 'bun:test'
import { buildIconCatalog, parseCatalogConfig } from '../scripts/catalog.ts'
import { parseSvg } from '../scripts/lib.ts'

describe('catalog generation', () => {
  test('is deterministic and covers every generated entry', async () => {
    const first = await buildIconCatalog()
    const second = await buildIconCatalog()

    expect(first).toEqual(second)
    expect(first.version).toBe(1)
    expect(first.icons.length).toBeGreaterThanOrEqual(100)
    expect(first.icons.map((icon) => icon.name)).toEqual(
      first.icons.map((icon) => icon.name).sort()
    )

    const categories = new Set(first.categories.map((category) => category.id))
    for (const icon of first.icons) {
      expect(categories.has(icon.category), icon.name).toBe(true)
      expect(icon.component).toMatch(/^[A-Z][A-Za-z0-9]*$/)
      expect(icon.svg).toContain('<svg')
    }
  })

  test('metadata validation rejects unknown categories', () => {
    expect(() => parseCatalogConfig({
      categories: [{ id: 'general', label: 'General', prefixes: [], keywords: [] }],
      overrides: { search: { category: 'missing', keywords: [] } }
    })).toThrow('Invalid metadata override')
  })
})

describe('strict SVG attributes', () => {
  test('rejects duplicate shape and root attributes', () => {
    expect(() => parseSvg(
      'duplicate',
      '<svg viewBox="0 0 24 24"><path d="M0 0" d="M1 1"/></svg>'
    )).toThrow('duplicate attribute')

    expect(() => parseSvg(
      'duplicate-root',
      '<svg viewBox="0 0 24 24" viewBox="0 0 24 24"><path d="M0 0"/></svg>'
    )).toThrow('duplicate attribute')
  })

  test('rejects unknown root attributes and negative dimensions', () => {
    expect(() => parseSvg(
      'event',
      '<svg viewBox="0 0 24 24" onclick="x"><path d="M0 0"/></svg>'
    )).toThrow('may not have')

    expect(() => parseSvg(
      'negative',
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="-1"/></svg>'
    )).toThrow('must not be negative')
  })
})