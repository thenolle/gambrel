import { describe, expect, test } from 'bun:test'
import { renderMarkdown, resolveDocLink, slugify } from '../src/markdown.ts'

function render(source: string, docPath = 'guides/page') {
  return renderMarkdown(source, { docPath })
}

describe('headings', () => {
  test('get unique ids and the first h1 becomes the title', () => {
    const doc = render('# Title\n\n## A\n\n## A')
    expect(doc.title).toBe('Title')
    expect(doc.headings.map((heading) => heading.id)).toEqual(['title', 'a', 'a-2'])
    expect(doc.html).toContain('<h2 id="a">')
    expect(doc.html).toContain('<h2 id="a-2">')
    expect(doc.html).toContain('href="#/guides/page@a-2"')
  })

  test('slugify keeps letters and digits', () => {
    expect(slugify('Loaders & Guards!')).toBe('loaders-guards')
    expect(slugify('???')).toBe('section')
  })
})

describe('inline formatting and safety', () => {
  test('renders emphasis and code', () => {
    const { html } = render('**b** *i* ~~s~~ `<x>`')
    expect(html).toContain('<strong>b</strong>')
    expect(html).toContain('<em>i</em>')
    expect(html).toContain('<del>s</del>')
    expect(html).toContain('<code>&lt;x&gt;</code>')
  })

  test('escapes raw HTML', () => {
    const { html } = render('<script>alert(1)</script>')
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  test('drops unsafe links and resolves document links', () => {
    expect(render('[x](javascript:alert(1))').html).not.toContain('href="javascript')
    expect(render('[ext](https://example.com)').html).toContain('rel="noopener noreferrer"')
    expect(render('[r](./routing.md#params)').html).toContain('href="#/guides/routing@params"')
    expect(render('[a](#local)').html).toContain('href="#/guides/page@local"')
  })

  test('resolveDocLink handles relative, parent and external targets', () => {
    expect(resolveDocLink('./a.md', 'guides/page')).toBe('#/guides/a')
    expect(resolveDocLink('../core.md', 'guides/page')).toBe('#/core')
    expect(resolveDocLink('/core.md#x', 'guides/page')).toBe('#/core@x')
    expect(resolveDocLink('https://x.dev/y.md', 'guides/page')).toBe('https://x.dev/y.md')
  })
})

describe('blocks', () => {
  test('fenced code gets a title, a language and highlighting', () => {
    const { html } = render('```ts title="src/a.ts"\nconst x = 1\n```')
    expect(html).toContain('<span class="code-title">src/a.ts</span>')
    expect(html).toContain('data-lang="ts"')
    expect(html).toContain('<span class="tok-k">const</span>')
    expect(html).toContain('class="copy"')
  })

  test('lists nest, number and show tasks', () => {
    const { html } = render('- one\n  - nested\n- two\n\n1. first\n2. second\n\n- [x] done\n- [ ] todo')
    expect(html).toContain('<li>one')
    expect(html).toContain('<ul><li>nested</li></ul>')
    expect(html).toContain('<ol><li>first</li><li>second</li></ol>')
    expect(html).toContain('type="checkbox" disabled checked')
    expect(html).toContain('type="checkbox" disabled>')
  })

  test('tables support alignment and escaped pipes', () => {
    const { html } = render('| A | B |\n|:--|--:|\n| 1 | a \\| b |')
    expect(html).toContain('<th>A</th>')
    expect(html).toContain('<th class="al-r">B</th>')
    expect(html).toContain('<td class="al-r">a | b</td>')
  })

  test('callouts and quotes', () => {
    const callout = render('> [!WARNING]\n> careful').html
    expect(callout).toContain('callout callout-warning')
    expect(callout).toContain('<p class="callout-title">Warning</p>')
    expect(callout).toContain('<p>careful</p>')
    expect(render('> plain').html).toContain('<blockquote><p>plain</p></blockquote>')
  })
})