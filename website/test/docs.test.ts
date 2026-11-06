import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { renderMarkdown } from '../src/markdown.ts'
import { docsRoot } from '../scripts/serve.ts'

interface Nav {
  sections: Array<{ pages: Array<{ title: string; path: string }> }>
}

async function loadNav(): Promise<Nav> {
  return JSON.parse(await readFile(join(docsRoot, 'nav.json'), 'utf8')) as Nav
}

describe('documentation content', () => {
  test('every page in the navigation exists and has a title', async () => {
    const nav = await loadNav()
    const paths = nav.sections.flatMap((section) => section.pages.map((page) => page.path))
    expect(new Set(paths).size).toBe(paths.length)
    for (const path of paths) {
      const doc = renderMarkdown(await readFile(join(docsRoot, `${path}.md`), 'utf8'), { docPath: path })
      expect(doc.title, path).not.toBe('')
      expect(doc.html, path).not.toContain('<script')
    }
  })

  test('every Markdown file is reachable from the navigation', async () => {
    const nav = await loadNav()
    const listed = new Set(nav.sections.flatMap((section) => section.pages.map((page) => `${page.path}.md`)))
    const files = (await readdir(docsRoot, { recursive: true })).map((file) => file.replaceAll('\\', '/'))
    const unlisted = files.filter((file) => file.endsWith('.md') && !listed.has(file))
    expect(unlisted).toEqual([])
  })

  test('internal links point at pages that exist', async () => {
    const nav = await loadNav()
    const known = new Set(nav.sections.flatMap((section) => section.pages.map((page) => page.path)))
    for (const path of known) {
      const { html } = renderMarkdown(await readFile(join(docsRoot, `${path}.md`), 'utf8'), { docPath: path })
      for (const match of html.matchAll(/href="#\/([^"@]*)(?:@[^"]*)?"/g)) {
        const target = match[1] ?? ''
        if (target !== '') expect(known.has(target), `${path} links to missing page '${target}'`).toBe(true)
      }
    }
  })
})