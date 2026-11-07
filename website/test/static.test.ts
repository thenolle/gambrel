import { describe, expect, test } from 'bun:test'
import { readdir, readFile, stat } from 'node:fs/promises'
import { join } from 'node:path'

const siteRoot = join(import.meta.dir, '..')
const dist = join(siteRoot, 'dist')

describe('the static site', () => {
  test('the shell only uses relative URLs, so it works under a sub-path like /gambrel/', async () => {
    const html = await readFile(join(siteRoot, 'public', 'index.html'), 'utf8')
    const absolute = [...html.matchAll(/\b(?:src|href)="(\/[^"]*)"/g)].map((match) => match[1])
    expect(absolute).toEqual([])
  })

  test('the build emits a complete, self-contained folder', async () => {
    const child = Bun.spawn([process.execPath, join(siteRoot, 'scripts', 'build.ts')], { stdout: 'ignore', stderr: 'inherit' })
    expect(await child.exited).toBe(0)

    for (const file of ['index.html', 'styles.css', 'app.js', '.nojekyll', 'docs/nav.json', 'docs/introduction.md']) {
      expect((await stat(join(dist, file))).isFile(), file).toBe(true)
    }

    const bundle = await readFile(join(dist, 'app.js'), 'utf8')
    expect(bundle.length).toBeGreaterThan(1000)
    expect(bundle).not.toContain('sourceMappingURL=data:')

    const entries = await readdir(join(dist, 'docs'))
    expect(entries.filter((entry) => entry.endsWith('.md')).length).toBeGreaterThan(20)
  }, 60_000)
})