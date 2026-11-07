/** @jsxImportSource @gambrel/view */
import { describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { renderToString } from '@gambrel/view'
import { generateModules, parseSvg, readIconDirectory, toPascalCase } from '../scripts/lib.ts'
import { ArrowUp, Check, createIcon, iconNames, renderIconSvg } from '../src/index.ts'
import { Icon, registry } from '../src/registry.ts'

const svgDirectory = join(import.meta.dir, '..', 'svg')
const generatedDirectory = join(import.meta.dir, '..', 'src', 'generated')

function file(inner: string, viewBox = '0 0 24 24'): string {
  return `<svg viewBox="${viewBox}">\n  ${inner}\n</svg>\n`
}

describe('parsing icon files', () => {
  test('reads shapes in order', () => {
    expect(parseSvg('demo', file('<circle cx="12" cy="12" r="3"/><path d="M0 0h24"/>'))).toEqual([
      ['circle', { cx: '12', cy: '12', r: '3' }],
      ['path', { d: 'M0 0h24' }]
    ])
  })

  test('rejects everything that could break consistency or safety', () => {
    const bad: Array<[string, string, string]> = [
      ['wrong viewBox', file('<path d="M0 0"/>', '0 0 16 16'), 'viewBox'],
      ['unknown element', file('<g/>'), 'not allowed'],
      ['stray text', file('<path d="M0 0"/> hello'), 'unsupported content'],
      ['styling attribute', file('<path d="M0 0" fill="red"/>'), "may not have the attribute 'fill'"],
      ['script in path data', file('<path d="alert(1)"/>'), 'invalid d'],
      ['missing geometry', file('<circle cx="1" cy="1"/>'), "missing 'r'"],
      ['non-numeric size', file('<circle cx="1" cy="1" r="big"/>'), 'invalid r'],
      ['no shapes', file(''), 'no shapes'],
      ['no svg root', '<path d="M0 0"/>', 'expected a single <svg>']
    ]
    for (const [label, source, message] of bad) {
      expect(() => parseSvg('demo', source), label).toThrow(message)
    }
  })

  test('names become PascalCase components', () => {
    expect(toPascalCase('check')).toBe('Check')
    expect(toPascalCase('arrow-up-right')).toBe('ArrowUpRight')
    expect(toPascalCase('volume-2')).toBe('Volume2')
  })

  test('an icon directory reports every problem together', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'gambrel-icons-'))
    try {
      await writeFile(join(directory, 'good.svg'), file('<path d="M0 0h24"/>'))
      await writeFile(join(directory, 'Bad_Name.svg'), file('<path d="M0 0h24"/>'))
      await writeFile(join(directory, 'broken.svg'), file('<g/>'))
      await expect(readIconDirectory(directory)).rejects.toThrow(/Bad_Name\.svg[\s\S]*broken\.svg/)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

describe('the library', () => {
  test('every shipped icon file is valid', async () => {
    const entries = await readIconDirectory(svgDirectory)
    expect(entries.length).toBeGreaterThanOrEqual(100)
    expect(entries.map((entry) => entry.name)).toEqual([...iconNames])
  })

  test('generated modules are up to date (run `bun run generate` if this fails)', async () => {
    const modules = generateModules(await readIconDirectory(svgDirectory))
    for (const [name, content] of Object.entries(modules)) {
      expect(await readFile(join(generatedDirectory, name), 'utf8'), name).toBe(content)
    }
  })

  test('generation is deterministic and sorted', async () => {
    const entries = await readIconDirectory(svgDirectory)
    expect(generateModules(entries)).toEqual(generateModules([...entries]))
    expect([...iconNames]).toEqual([...iconNames].sort())
  })
})

describe('rendering', () => {
  test('an icon is a decorative inline svg by default', async () => {
    const html = await renderToString(<Check />)
    expect(html).toContain('<svg ')
    expect(html).toContain('viewBox="0 0 24 24"')
    expect(html).toContain('width="24"')
    expect(html).toContain('stroke="currentColor"')
    expect(html).toContain('aria-hidden="true"')
    expect(html).toContain('class="gb-icon gb-icon-check"')
    expect(html).toContain('<path d="M20 6 9 17l-5-5"></path>')
  })

  test('size, color, stroke width and class are applied', async () => {
    const html = await renderToString(<ArrowUp size={16} color="red" strokeWidth={1.5} class="mr-2" />)
    expect(html).toContain('width="16"')
    expect(html).toContain('height="16"')
    expect(html).toContain('stroke="red"')
    expect(html).toContain('stroke-width="1.5"')
    expect(html).toContain('class="gb-icon gb-icon-arrow-up mr-2"')
  })

  test('a title or aria-label gives the icon an accessible name', async () => {
    const titled = await renderToString(<Check title="Done" />)
    expect(titled).toContain('role="img"')
    expect(titled).toContain('<title>Done</title>')
    expect(titled).not.toContain('aria-hidden')
    const labelled = await renderToString(<Check aria-label="Done" />)
    expect(labelled).toContain('role="img"')
    expect(labelled).not.toContain('aria-hidden')
  })

  test('createIcon builds custom icons that behave the same', async () => {
    const Dot = createIcon('dot-custom', [['circle', { cx: '12', cy: '12', r: '2' }]])
    expect(await renderToString(<Dot />)).toContain('<circle cx="12" cy="12" r="2"></circle>')
  })

  test('renderIconSvg produces a standalone file with xmlns', () => {
    const svg = renderIconSvg([['path', { d: 'M0 0h24' }]], { size: 32 })
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"')).toBe(true)
    expect(svg).toContain('<path d="M0 0h24"/>')
  })
})

describe('registry', () => {
  test('every name has a component', () => {
    expect(Object.keys(registry).sort()).toEqual([...iconNames])
    for (const name of iconNames) expect(typeof registry[name]).toBe('function')
  })

  test('the Icon component renders by name and forwards props', async () => {
    const html = await renderToString(<Icon name="check" size={20} />)
    expect(html).toContain('gb-icon-check')
    expect(html).toContain('width="20"')
  })

  test('an unknown name fails loudly', () => {
    expect(() => Icon({ name: 'nope' as never })).toThrow("Unknown icon 'nope'")
  })
})