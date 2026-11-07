import { describe, expect, test } from 'bun:test'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const publicDir = join(import.meta.dir, '..', 'public')

describe('Gambrel website branding', () => {
  for (const page of ['index.html', 'icons.html']) {
    test(`${page} uses the shared brand mark and favicon`, async () => {
      const html = await readFile(join(publicDir, page), 'utf8')

      expect(html).toContain('href="favicon.svg"')
      expect(html).toContain('type="image/svg+xml"')
      expect(html).toContain('src="gambrel.svg"')
      expect(html).toContain('aria-label="Gambrel documentation home"')
      expect(html).not.toContain('class="logo-mark">G</span>')
      expect(html).not.toMatch(/(?:src|href)="\/(?:gambrel|favicon)\.svg"/)
    })
  }

  for (const asset of ['gambrel.svg', 'favicon.svg']) {
    test(`${asset} is self-contained SVG`, async () => {
      const svg = await readFile(join(publicDir, asset), 'utf8')

      expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
      expect(svg).toContain('viewBox="0 0 32 32"')
      expect(svg).toContain('<path')
      expect(svg).not.toMatch(/<script\b/i)
      expect(svg).not.toMatch(/<foreignObject\b/i)
      expect(svg).not.toMatch(/\son[a-z]+\s*=/i)
      expect(svg).not.toMatch(/(?:href|src)\s*=/i)
      expect(svg).not.toContain('<text')
    })
  }
})