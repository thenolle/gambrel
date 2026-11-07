import { byId, fetchText } from './dom.ts'
import { filterIcons, importSnippet, jsxSnippet, parseCatalog, type CatalogIcon } from './icon-catalog-model.ts'
import { applyTheme, readChoice } from './theme.ts'

const SVG_NS = 'http://www.w3.org/2000/svg'

const ALLOWED: Readonly<Record<string, readonly string[]>> = {
  svg: ['xmlns', 'width', 'height', 'viewBox', 'fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin'],
  path: ['d'],
  circle: ['cx', 'cy', 'r'],
  ellipse: ['cx', 'cy', 'rx', 'ry'],
  rect: ['x', 'y', 'width', 'height', 'rx', 'ry'],
  line: ['x1', 'y1', 'x2', 'y2'],
  polyline: ['points'],
  polygon: ['points']
}

function parseSvg(source: string): SVGSVGElement {
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml')
  const root = parsed.documentElement
  if (root.localName !== 'svg' || root.namespaceURI !== SVG_NS) throw new TypeError('Invalid catalog SVG')
  for (const element of [root, ...Array.from(root.querySelectorAll('*'))]) {
    const allowed = ALLOWED[element.localName]
    if (allowed === undefined || element.namespaceURI !== SVG_NS) throw new TypeError('Unsupported catalog SVG element')
    if (element !== root && element.localName === 'svg') throw new TypeError('Nested SVG roots are not allowed')
    for (const attribute of Array.from(element.attributes)) {
      if (!allowed.includes(attribute.name)) throw new TypeError(`Unsupported SVG attribute '${attribute.name}'`)
    }
  }
  if (root.getAttribute('viewBox') !== '0 0 24 24' || root.getAttribute('fill') !== 'none' || root.getAttribute('stroke') !== 'currentColor' || root.getAttribute('stroke-linecap') !== 'round' || root.getAttribute('stroke-linejoin') !== 'round') throw new TypeError('Unexpected catalog SVG presentation')
  const imported = document.importNode(root, true) as unknown as SVGSVGElement
  imported.setAttribute('aria-hidden', 'true')
  return imported
}

async function main(): Promise<void> {
  applyTheme(readChoice())
  const catalog = parseCatalog(JSON.parse(await fetchText('icons.json')))
  const search = byId<HTMLInputElement>('icon-search')
  const category = byId<HTMLSelectElement>('icon-category')
  const size = byId<HTMLInputElement>('icon-size')
  const stroke = byId<HTMLInputElement>('icon-stroke')
  const color = byId<HTMLInputElement>('icon-color')
  const grid = byId('icon-grid')
  const preview = byId('icon-preview')
  const status = byId('catalog-status')
  const snippet = byId('icon-snippet')
  const copyStatus = byId('copy-status')
  const copyImport = byId<HTMLButtonElement>('copy-import')
  const copyJsx = byId<HTMLButtonElement>('copy-jsx')
  const copySvg = byId<HTMLButtonElement>('copy-svg')
  const templates = new Map(catalog.icons.map((icon) => [icon.name, parseSvg(icon.svg)]))
  let selected: CatalogIcon | undefined
  for (const entry of catalog.categories) {
    const option = document.createElement('option')
    option.value = entry.id
    option.textContent = entry.label
    category.append(option)
  }
  const currentSvg = (): SVGSVGElement | undefined => {
    if (selected === undefined) return undefined
    const template = templates.get(selected.name)
    if (template === undefined) return undefined
    const svg = template.cloneNode(true) as SVGSVGElement
    svg.setAttribute('width', size.value)
    svg.setAttribute('height', size.value)
    svg.setAttribute('stroke-width', stroke.value)
    svg.setAttribute('stroke', color.value)
    svg.removeAttribute('aria-hidden')
    return svg
  }
  const updateControls = (): void => {
    document.body.style.setProperty('--catalog-size', `${size.value}px`)
    document.body.style.setProperty('--catalog-stroke', stroke.value)
    document.body.style.setProperty('--catalog-color', color.value)
    byId<HTMLOutputElement>('icon-size-output').value = size.value
    byId<HTMLOutputElement>('icon-stroke-output').value = stroke.value
    if (selected !== undefined) snippet.textContent = [importSnippet(selected), '', jsxSnippet(selected, Number(size.value), Number(stroke.value), color.value)].join('\n')
  }
  const choose = (icon: CatalogIcon): void => {
    selected = icon
    byId('icon-name').textContent = icon.component
    byId('icon-keywords').textContent = icon.keywords.join(' · ')
    copyStatus.textContent = ''
    preview.replaceChildren()
    const template = templates.get(icon.name)
    if (template !== undefined) preview.append(template.cloneNode(true))
    for (const button of [copyImport, copyJsx, copySvg]) button.disabled = false
    grid.querySelectorAll<HTMLButtonElement>('button[data-icon]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset['icon'] === icon.name))
    })
    updateControls()
  }
  const render = (): void => {
    const icons = filterIcons(catalog.icons, search.value, category.value)
    grid.replaceChildren()
    for (const icon of icons) {
      const button = document.createElement('button')
      button.type = 'button'
      button.className = 'icon-tile'
      button.dataset['icon'] = icon.name
      button.setAttribute('aria-label', `Select ${icon.component}`)
      button.setAttribute('aria-pressed', String(selected?.name === icon.name))
      const template = templates.get(icon.name)
      if (template !== undefined) button.append(template.cloneNode(true))
      const label = document.createElement('span')
      label.textContent = icon.name
      button.append(label)
      button.addEventListener('click', () => choose(icon))
      grid.append(button)
    }
    status.textContent = `${icons.length} of ${catalog.icons.length} icons`
  }
  const copy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      copyStatus.textContent = 'Copied to clipboard.'
    } catch {
      copyStatus.textContent = 'Clipboard unavailable. Select and copy the snippet manually.'
      snippet.textContent = text
    }
  }
  copyImport.addEventListener('click', () => {
    if (selected !== undefined) void copy(importSnippet(selected))
  })
  copyJsx.addEventListener('click', () => {
    if (selected !== undefined) void copy(jsxSnippet(selected, Number(size.value), Number(stroke.value), color.value))
  })
  copySvg.addEventListener('click', () => {
    const svg = currentSvg()
    if (svg !== undefined) void copy(new XMLSerializer().serializeToString(svg))
  })
  search.addEventListener('input', render)
  category.addEventListener('change', render)
  for (const input of [size, stroke, color]) input.addEventListener('input', updateControls)
  byId<HTMLFormElement>('catalog-controls').addEventListener('submit', (event) => event.preventDefault())
  updateControls()
  render()
  const first = catalog.icons[0]
  if (first !== undefined) choose(first)
}

main().catch((error: unknown) => {
  const status = document.getElementById('catalog-status')
  if (status !== null) status.textContent = `Catalog unavailable: ${error instanceof Error ? error.message : String(error)}`
})