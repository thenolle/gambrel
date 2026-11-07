import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { readIconDirectory, toPascalCase } from './lib.ts'
import { renderIconSvg } from '../src/svg.ts'

interface Category {
  readonly id: string
  readonly label: string
  readonly prefixes: readonly string[]
  readonly keywords: readonly string[]
}

interface Override {
  readonly category: string
  readonly keywords: readonly string[]
}

interface CatalogConfig {
  readonly categories: readonly Category[]
  readonly overrides: Readonly<Record<string, Override>>
}

export interface CatalogIcon {
  readonly name: string
  readonly component: string
  readonly category: string
  readonly keywords: readonly string[]
  readonly svg: string
}

export interface IconCatalog {
  readonly version: 1
  readonly categories: readonly { readonly id: string; readonly label: string }[]
  readonly icons: readonly CatalogIcon[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

export function parseCatalogConfig(value: unknown): CatalogConfig {
  if (!record(value) || !Array.isArray(value['categories']) || !record(value['overrides'])) throw new TypeError('Invalid icon catalog configuration')
  const ids = new Set<string>()
  const categories: Category[] = value['categories'].map((item: unknown) => {
    if (!record(item) || typeof item['id'] !== 'string' || !/^[a-z][a-z0-9-]*$/.test(item['id']) || typeof item['label'] !== 'string' || item['label'].trim() === '' || !strings(item['prefixes']) || !strings(item['keywords'])) throw new TypeError('Invalid icon catalog category')
    if (ids.has(item['id'])) throw new TypeError(`Duplicate category '${item['id']}'`)
    ids.add(item['id'])
    return {
      id: item['id'],
      label: item['label'],
      prefixes: item['prefixes'],
      keywords: item['keywords']
    }
  })
  if (!ids.has('general')) throw new TypeError('Icon catalog requires the general category')
  const overrides: Record<string, Override> = Object.create(null) as Record<string, Override>
  for (const [name, item] of Object.entries(value['overrides'])) {
    if (!record(item) || typeof item['category'] !== 'string' || !ids.has(item['category']) || !strings(item['keywords'])) throw new TypeError(`Invalid metadata override for '${name}'`)
    overrides[name] = {
      category: item['category'],
      keywords: item['keywords']
    }
  }
  return { categories, overrides }
}

export async function buildIconCatalog(): Promise<IconCatalog> {
  const root = join(import.meta.dir, '..')
  const config = parseCatalogConfig(JSON.parse(await readFile(join(root, 'catalog.config.json'), 'utf8')))
  const entries = await readIconDirectory(join(root, 'svg'))
  const names = new Set(entries.map((entry) => entry.name))
  for (const name of Object.keys(config.overrides)) {
    if (!names.has(name)) throw new TypeError(`Metadata references missing icon '${name}'`)
  }
  const icons = entries.map((entry): CatalogIcon => {
    const override = config.overrides[entry.name]
    const category = override === undefined ? config.categories.find((item) => item.prefixes.some((prefix) => entry.name === prefix || entry.name.startsWith(`${prefix}-`))) : config.categories.find((item) => item.id === override.category)
    const selected = category ?? config.categories.find((item) => item.id === 'general')
    if (selected === undefined) throw new TypeError('Missing general category')
    return {
      name: entry.name,
      component: toPascalCase(entry.name),
      category: selected.id,
      keywords: [...new Set([
        ...entry.name.split('-'),
        ...selected.keywords,
        ...(override?.keywords ?? [])
      ])].sort(),
      svg: renderIconSvg(entry.node)
    }
  })
  return {
    version: 1,
    categories: config.categories.map(({ id, label }) => ({ id, label })),
    icons
  }
}