import { describe, expect, test } from 'bun:test'
import { icons } from '../src/icons.ts'
import { renderLanding } from '../src/landing.ts'
import { flatten, parseNav } from '../src/nav.ts'
import { readingMinutes } from '../src/reading.ts'
import { resolveTheme } from '../src/theme.ts'
import { unescapeHtml } from '../src/escape.ts'

const nav = parseNav({
  title: 'Demo <docs>',
  repo: 'https://github.com/acme/demo',
  sections: [
    { title: 'Start', pages: [{ title: 'Getting started', path: 'getting-started', summary: 'Install <it>' }] },
    { title: 'Reference', pages: [{ title: 'Cheat sheet', path: 'cheatsheet' }, { title: 'API', path: 'api' }] }
  ]
})

describe('navigation', () => {
  test('flatten keeps reading order and tags the section', () => {
    expect(flatten(nav).map((page) => `${page.section}/${page.path}`)).toEqual([
      'Start/getting-started',
      'Reference/cheatsheet',
      'Reference/api'
    ])
  })

  test('parseNav rejects a malformed file', () => {
    expect(() => parseNav({ title: 'x' })).toThrow('docs/nav.json is invalid')
    expect(() => parseNav({ title: 'x', repo: 'y', sections: [{ title: 's', pages: [{ title: 1 }] }] })).toThrow(
      'docs/nav.json is invalid'
    )
  })
})

describe('landing page', () => {
  test('escapes titles and summaries', () => {
    const html = renderLanding(nav)
    expect(html).toContain('Demo &lt;docs&gt;')
    expect(html).toContain('Install &lt;it&gt;')
    expect(html).not.toContain('<it>')
  })

  test('links to the guide pages that exist and counts pages', () => {
    const html = renderLanding(nav)
    expect(html).toContain('href="#/getting-started"')
    expect(html).toContain('href="#/cheatsheet"')
    expect(html).toContain('1 page<')
    expect(html).toContain('2 pages<')
  })

  test('shows install commands derived from the repository', () => {
    const text = unescapeHtml(renderLanding(nav).replace(/<[^>]+>/g, ''))
    expect(text).toContain('git clone https://github.com/acme/demo.git')
    expect(text).toContain('cd demo && bun install')
    expect(text).toContain('bun run build && bun run start')
  })

  test('falls back to the first page when there is no getting-started page', () => {
    const small = parseNav({ title: 'T', repo: 'https://x.dev/r', sections: [{ title: 'S', pages: [{ title: 'One', path: 'one' }] }] })
    const html = renderLanding(small)
    expect(html).toContain('href="#/one"')
    expect(html).not.toContain('Cheat sheet')
  })

  test('an empty navigation has no start button', () => {
    expect(renderLanding(parseNav({ title: 'T', repo: 'https://x.dev/r', sections: [] }))).not.toContain('Get started')
  })
})

describe('reading time', () => {
  test('is at least one minute and ignores code blocks', () => {
    expect(readingMinutes('<p>short</p>')).toBe(1)
    const words = Array.from({ length: 400 }, () => 'word').join(' ')
    expect(readingMinutes(`<p>${words}</p>`)).toBe(2)
    expect(readingMinutes(`<p>one</p><figure class="code"><pre>${words}</pre></figure>`)).toBe(1)
  })
})

describe('theme and icons', () => {
  test('system follows the operating system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('light', true)).toBe('light')
  })

  test('every icon is a self-contained decorative svg', () => {
    for (const icon of Object.values(icons)) {
      expect(icon.startsWith('<svg ')).toBe(true)
      expect(icon).toContain('aria-hidden="true"')
      expect(icon).not.toContain('<script')
    }
  })
})