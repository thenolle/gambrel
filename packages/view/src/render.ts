import { isRawHtml, isVNode } from './element.ts'
import { escapeAttribute, escapeText } from './escape.ts'
import type { Child, Props, VNode } from './types.ts'

const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'
])

const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set(['script', 'style'])
const RESERVED_PROPS: ReadonlySet<string> = new Set(['children', 'key', 'ref'])
const RENAMED_PROPS: ReadonlyMap<string, string> = new Map([
  ['className', 'class'],
  ['htmlFor', 'for']
])

const TAG_NAME = /^[A-Za-z][A-Za-z0-9-]*$/
const ATTRIBUTE_NAME = /^[A-Za-z_:][-A-Za-z0-9_:.]*$/
const EVENT_PROP = /^on/i

function describeType(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  return typeof value
}

function isChildArray(value: unknown): value is readonly Child[] {
  return Array.isArray(value)
}

function renderAttribute(name: string, input: unknown): string {
  const value = typeof input === 'function' ? (input as () => unknown)() : input
  if (value === null || value === undefined || value === false) return ''
  if (value === true) return ` ${name}`
  if (typeof value === 'string') return ` ${name}="${escapeAttribute(value)}"`
  if (typeof value === 'number' && Number.isFinite(value)) return ` ${name}="${value}"`
  throw new TypeError(`Attribute '${name}' has an unsupported value of type ${describeType(value)}`)
}

function renderAttributes(props: Props): string {
  let output = ''
  for (const name of Object.keys(props)) {
    if (RESERVED_PROPS.has(name) || EVENT_PROP.test(name)) continue
    const replacement = RENAMED_PROPS.get(name)
    if (replacement !== undefined) throw new TypeError(`Use '${replacement}' instead of '${name}'`)
    if (!ATTRIBUTE_NAME.test(name)) throw new TypeError(`Invalid attribute name '${name}'`)
    output += renderAttribute(name, props[name])
  }
  return output
}

function renderText(text: string, insideRawText: boolean): string {
  if (!insideRawText) return escapeText(text)
  if (text === '') return ''
  throw new TypeError('Text inside <script> and <style> must be passed through raw()')
}

async function renderVNode(node: VNode, insideRawText: boolean): Promise<string> {
  const { type, props } = node
  if (typeof type === 'function') {
    const component = type as (props: Props) => Child | Promise<Child>
    return renderChild(await component(props), insideRawText)
  }
  if (insideRawText) throw new TypeError(`Element <${type}> cannot be nested inside <script> or <style>`)
  if (!TAG_NAME.test(type)) throw new TypeError(`Invalid element name '${type}'`)
  const attributes = renderAttributes(props)
  if (VOID_ELEMENTS.has(type)) {
    const content = await renderChild(props.children, false)
    if (content !== '') throw new TypeError(`<${type}> is a void element and cannot have children`)
    return `<${type}${attributes}>`
  }
  const content = await renderChild(props.children, RAW_TEXT_ELEMENTS.has(type))
  return `<${type}${attributes}>${content}</${type}>`
}

async function renderChild(child: Child, insideRawText: boolean): Promise<string> {
  if (child === null || child === undefined || typeof child === 'boolean') return ''
  if (typeof child === 'string') return renderText(child, insideRawText)
  if (typeof child === 'number') return renderText(String(child), insideRawText)
  if (typeof child === 'function') return renderChild(child(), insideRawText)
  if (isChildArray(child)) {
    let output = ''
    for (const item of child) output += await renderChild(item, insideRawText)
    return output
  }
  if (isRawHtml(child)) return child.html
  if (isVNode(child)) return renderVNode(child, insideRawText)
  throw new TypeError(`Cannot render a value of type ${describeType(child)}`)
}

/**
 * Renders a child tree to an HTML string.
 *
 * Async components are awaited sequentially in document order, so the output never
 * depends on timing. The renderer never touches browser globals.
 */
export function renderToString(node: Child): Promise<string> {
  return renderChild(node, false)
}