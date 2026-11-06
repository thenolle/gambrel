import { assertAttributeName, isEventProp, isReservedProp, normalizeAttribute } from './attributes.ts'
import { isRawHtml, isVNode } from './element.ts'
import { escapeAttribute, escapeText } from './escape.ts'
import type { Child, Props, VNode } from './types.ts'
import { describeType, isChildArray } from './util.ts'

const VOID_ELEMENTS: ReadonlySet<string> = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'
])

const RAW_TEXT_ELEMENTS: ReadonlySet<string> = new Set(['script', 'style'])
const TAG_NAME = /^[A-Za-z][A-Za-z0-9-]*$/

function renderAttribute(name: string, input: unknown): string {
  const value = normalizeAttribute(name, typeof input === 'function' ? (input as () => unknown)() : input)
  if (value === null) return ''
  if (value === true) return ` ${name}`
  return ` ${name}="${escapeAttribute(value)}"`
}

function renderAttributes(props: Props): string {
  let output = ''
  for (const name of Object.keys(props)) {
    if (isReservedProp(name) || isEventProp(name)) continue
    assertAttributeName(name)
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