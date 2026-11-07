import { describe, expect, test } from 'bun:test'
import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { buildCss } from '../scripts/build-css.ts'

const root = join(import.meta.dir, '..')

describe('stylesheet', () => {
  test('src/styles.css is up to date (run `bun run build:css` if this fails)', async () => {
    expect(await readFile(join(root, 'src', 'styles.css'), 'utf8')).toBe(await buildCss())
  })

  test('every gb-* class used by a component has a style', async () => {
    const css = await readFile(join(root, 'src', 'styles.css'), 'utf8')
    const directory = join(root, 'src', 'components')
    const missing: string[] = []
    for (const file of await readdir(directory)) {
      const source = await readFile(join(directory, file), 'utf8')
      for (const name of new Set(source.match(/gb-[a-z0-9]+(?:-[a-z0-9]+)*/g) ?? [])) {
        if (!css.includes(`.${name}`)) missing.push(`${file}: .${name}`)
      }
    }
    expect(missing).toEqual([])
  })

  test('uses only design tokens for colors', async () => {
    const css = await readFile(join(root, 'src', 'styles.css'), 'utf8')
    expect(css).toContain('--primary')
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/)
  })
})