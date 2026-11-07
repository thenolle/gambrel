export interface CatalogIcon {
  readonly name: string
  readonly component: string
  readonly category: string
  readonly keywords: readonly string[]
  readonly svg: string
}

export interface Catalog {
  readonly version: 1
  readonly categories: readonly { readonly id: string; readonly label: string }[]
  readonly icons: readonly CatalogIcon[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function parseCatalog(value: unknown): Catalog {
  if (!record(value) || value['version'] !== 1 || !Array.isArray(value['categories']) || !Array.isArray(value['icons'])) throw new TypeError('Unsupported icon catalog')
  const categories = value['categories'].map((item: unknown) => {
    if (!record(item) || typeof item['id'] !== 'string' || typeof item['label'] !== 'string') throw new TypeError('Invalid catalog category')
    return { id: item['id'], label: item['label'] }
  })
  const categoryIds = new Set(categories.map((category) => category.id))
  if (categoryIds.size !== categories.length) throw new TypeError('Duplicate catalog categories')
  const names = new Set<string>()
  const icons = value['icons'].map((item: unknown): CatalogIcon => {
    if (!record(item) || typeof item['name'] !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(item['name']) || typeof item['component'] !== 'string' || !/^[A-Z][A-Za-z0-9]*$/.test(item['component']) || typeof item['category'] !== 'string' || !categoryIds.has(item['category']) || !Array.isArray(item['keywords']) || !item['keywords'].every((word) => typeof word === 'string') || typeof item['svg'] !== 'string') throw new TypeError('Invalid catalog icon')
    if (names.has(item['name'])) throw new TypeError(`Duplicate icon '${item['name']}'`)
    names.add(item['name'])
    return {
      name: item['name'],
      component: item['component'],
      category: item['category'],
      keywords: item['keywords'] as string[],
      svg: item['svg']
    }
  })
  return { version: 1, categories, icons }
}

export function filterIcons(icons: readonly CatalogIcon[], query: string, category: string): CatalogIcon[] {
  const words = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean)
  return icons.filter((icon) => {
    if (category !== '' && icon.category !== category) return false
    const text = [icon.name, icon.component, icon.category, ...icon.keywords].join(' ').toLocaleLowerCase()
    return words.every((word) => text.includes(word))
  })
}

export function importSnippet(icon: CatalogIcon): string {
  return `import { ${icon.component} } from '@gambrel/icons'`
}

export function jsxSnippet(icon: CatalogIcon, size: number, stroke: number, color: string): string {
  return `<${icon.component} size={${size}} strokeWidth={${stroke}} color="${color}" />`
}