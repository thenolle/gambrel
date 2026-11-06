import { describe, expect, test } from 'bun:test'
import { renderMarkdown } from '../src/markdown.ts'
import { excerpt, search, sectionsOf, tokensOf } from '../src/search.ts'

const doc = renderMarkdown(
  '# Routing\n\nIntro text.\n\n## Loaders\n\nLoaders return JSON data.\n\n## Guards\n\nGuards redirect or deny.',
  { docPath: 'router' }
)
const sections = sectionsOf('router', 'Routing', doc.html)

describe('search', () => {
  test('splits a page into one section per heading', () => {
    expect(sections.map((section) => section.heading)).toEqual(['Routing', 'Loaders', 'Guards'])
    expect(sections[1]?.id).toBe('loaders')
    expect(sections[1]?.text).toContain('JSON data')
  })

  test('ranks heading matches first and requires every word', () => {
    expect(search(sections, 'loaders')[0]?.section.heading).toBe('Loaders')
    expect(search(sections, 'guards redirect')[0]?.section.heading).toBe('Guards')
    expect(search(sections, 'loaders redirect')).toEqual([])
    expect(search(sections, '   ')).toEqual([])
  })

  test('excerpts are HTML-safe and mark matches', () => {
    const html = excerpt('Use <b>Loaders</b> here', tokensOf('loaders'))
    expect(html).toContain('<mark>Loaders</mark>')
    expect(html).not.toContain('<b>')
  })
})