import { describe, expect, test } from 'bun:test'
import {
  filterIcons,
  importSnippet,
  jsxSnippet,
  parseCatalog
} from '../src/icon-catalog-model.ts'

const catalog = parseCatalog({
  version: 1,
  categories: [{ id: 'navigation', label: 'Navigation' }],
  icons: [
    {
      name: 'search',
      component: 'Search',
      category: 'navigation',
      keywords: ['find', 'lookup'],
      svg: '<svg/>'
    },
    {
      name: 'arrow-up',
      component: 'ArrowUp',
      category: 'navigation',
      keywords: ['direction'],
      svg: '<svg/>'
    }
  ]
})

describe('icon catalog model', () => {
  test('filters by keywords, component name and category', () => {
    expect(filterIcons(catalog.icons, 'lookup', '').map((icon) => icon.name)).toEqual(['search'])
    expect(filterIcons(catalog.icons, 'ArrowUp', 'navigation').length).toBe(1)
    expect(filterIcons(catalog.icons, 'lookup direction', '').length).toBe(0)
    expect(filterIcons(catalog.icons, '', 'missing').length).toBe(0)
  })

  test('produces copyable import and JSX snippets', () => {
    const icon = catalog.icons[0]
    if (icon === undefined) throw new Error('Missing fixture')
    expect(importSnippet(icon)).toBe("import { Search } from '@gambrel/icons'")
    expect(jsxSnippet(icon, 20, 1.5, '#112233')).toBe(
      '<Search size={20} strokeWidth={1.5} color="#112233" />'
    )
  })

  test('rejects malformed metadata', () => {
    expect(() => parseCatalog({ version: 2 })).toThrow('Unsupported')
    expect(() => parseCatalog({
      version: 1,
      categories: [],
      icons: [{ name: 'bad' }]
    })).toThrow('Invalid catalog icon')
  })
})