import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { IconNode } from '../src/types.ts'

export class IconError extends Error {
  readonly icon: string

  constructor(icon: string, message: string) {
    super(`${icon}.svg: ${message}`)
    this.name = 'IconError'
    this.icon = icon
  }
}

export interface IconEntry {
  readonly name: string
  readonly node: IconNode
}

const NAME = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/
const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)$/
const PATH_DATA = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+\-.,\s]+$/
const POINTS = /^[0-9eE+\-.,\s]+$/

const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points']
}

const REQUIRED: Readonly<Record<string, readonly string[]>> = {
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['width', 'height'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points']
}

/**
 * `arrow-up-right` becomes `ArrowUpRight`.
 */
export function toPascalCase(name: string): string {
  return name.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('')
}

function parseAttributes(icon: string, tag: string, source: string): Record<string, string> {
  const attributes: Record<string, string> = {}
  const rest = source.replace(/([a-zA-Z][\w-]*)="([^"]*)"/g, (_match, key: string, value: string) => {
    attributes[key] = value
    return ''
  })
  if (rest.trim() !== '') throw new IconError(icon, `<${tag}> has malformed attributes: ${rest.trim().slice(0, 40)}`)
  const allowed = ALLOWED[tag] ?? []
  for (const [key, value] of Object.entries(attributes)) {
    if (!allowed.includes(key)) throw new IconError(icon, `<${tag}> may not have the attribute '${key}' (allowed: ${allowed.join(', ')})`)
    const valid = key === 'd' ? PATH_DATA.test(value) : key === 'points' ? POINTS.test(value) : NUMBER.test(value)
    if (!valid) throw new IconError(icon, `<${tag}> has an invalid ${key}="${value.slice(0, 30)}"`)
  }
  for (const key of REQUIRED[tag] ?? []) {
    if (attributes[key] === undefined) throw new IconError(icon, `<${tag}> is missing '${key}'`)
  }
  return attributes
}

/**
 * Parses and validates one icon file. Only the shapes in `ALLOWED` are accepted, with no
 * fill, stroke, style or scripts, so every icon stays consistent and safe.
 */
export function parseSvg(icon: string, source: string): IconNode {
  const root = /^\s*<svg\b([^>]*)>([\s\S]*)<\/svg>\s*$/.exec(source)
  if (root === null) throw new IconError(icon, 'expected a single <svg>...</svg> element')
  const viewBox = /viewBox="([^"]*)"/.exec(root[1] ?? '')?.[1]
  if (viewBox !== '0 0 24 24') throw new IconError(icon, `viewBox must be "0 0 24 24", received ${JSON.stringify(viewBox)}`)
  const shapes: Array<readonly [string, Readonly<Record<string, string>>]> = []
  const leftover = (root[2] ?? '').replace(/<([a-z]+)\s+([^<>]*?)\s*\/>/g, (_match, tag: string, attributes: string) => {
    if (ALLOWED[tag] === undefined) throw new IconError(icon, `<${tag}> is not allowed (use ${Object.keys(ALLOWED).join(', ')})`)
    shapes.push([tag, parseAttributes(icon, tag, attributes)])
    return ''
  })
  if (leftover.trim() !== '') throw new IconError(icon, `unsupported content: ${leftover.trim().slice(0, 40)} (use self-closing shape elements only)`)
  if (shapes.length === 0) throw new IconError(icon, 'the icon has no shapes')
  return shapes
}

/**
 * Reads every `*.svg` in a directory, sorted by name. All problems are reported together.
 */
export async function readIconDirectory(directory: string): Promise<IconEntry[]> {
  const files = (await readdir(directory)).filter((file) => file.endsWith('.svg')).sort()
  const entries: IconEntry[] = []
  const problems: string[] = []
  const components = new Map<string, string>()
  for (const file of files) {
    const name = file.slice(0, -4)
    if (!NAME.test(name)) {
      problems.push(`${file}: the name must be kebab-case (lowercase letters, digits and single hyphens, starting with a letter)`)
      continue
    }
    const component = toPascalCase(name)
    const existing = components.get(component)
    if (existing !== undefined) {
      problems.push(`${file}: produces the component ${component}, which '${existing}' already uses`)
      continue
    }
    components.set(component, name)
    try {
      entries.push({ name, node: parseSvg(name, await readFile(join(directory, file), 'utf8')) })
    } catch (error) {
      if (!(error instanceof IconError)) throw error
      problems.push(error.message)
    }
  }
  if (problems.length > 0) throw new Error(`Invalid icons:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`)
  return entries
}

function quote(value: string): string {
  return `'${value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`
}

export type GeneratedName = 'icons.ts' | 'names.ts' | 'registry.ts'

const HEADER = '// Generated by scripts/generate.ts from svg/*.svg. Do not edit.'

/**
 * Renders the three generated modules. Pure and deterministic.
 */
export function generateModules(entries: readonly IconEntry[]): Record<GeneratedName, string> {
  const icons = entries.map(({ name, node }) => {
    const shapes = node.map(([tag, attributes]) => {
      const list = Object.entries(attributes).map(([key, value]) => `${key}: ${quote(value)}`).join(', ')
      return `[${quote(tag)}, { ${list} }]`
    }).join(', ')
    return `export const ${toPascalCase(name)} = createIcon(${quote(name)}, [${shapes}])`
  })
  const names = entries.map(({ name }) => `  ${quote(name)}`).join(',\n')
  const registry = entries.map(({ name }) => `  ${quote(name)}: icons.${toPascalCase(name)}`).join(',\n')
  return {
    'icons.ts': [HEADER, '', "import { createIcon } from '../create-icon.ts'", '', ...icons, ''].join('\n'),
    'names.ts': [HEADER, '', 'export const iconNames = [', names, '] as const', '', 'export type IconName = (typeof iconNames)[number]', ''].join('\n'),
    'registry.ts': [
      HEADER,
      '',
      "import type { IconComponent } from '../types.ts'",
      "import * as icons from './icons.ts'",
      "import type { IconName } from './names.ts'",
      '',
      'export type { IconName }',
      '',
      'export const registry: Readonly<Record<IconName, IconComponent>> = {',
      registry,
      '}',
      ''
    ].join('\n')
  }
}