import { effect, onCleanup, root, untrack } from '@gambrel/reactivity'
import { assertAttributeName, describeType, eventType, isChildArray, isEventProp, isRawHtml, isReservedProp, isVNode, normalizeAttribute, type Child, type Props, type VNode } from '@gambrel/view'
import { FRAMEWORK_ATTRIBUTE } from '@gambrel/router'

const ELEMENT_NODE = 1
const TEXT_NODE = 3
const COMMENT_NODE = 8
const DOCUMENT_NODE = 9
const DOCUMENT_TYPE_NODE = 10

const PROPERTY_ATTRIBUTES: ReadonlySet<string> = new Set(['value', 'checked', 'selected'])
const SVG_NAMESPACE = 'http://www.w3.org/2000/svg'

export interface HydrationMismatch {
  readonly message: string
  readonly path: string
}

/**
 * A cursor into a parent's children. When `hydrating`, `next` is the next unclaimed
 * server node. Otherwise new nodes are inserted before `next` (null appends).
 */
export interface Position {
  parent: Node
  next: Node | null
  readonly hydrating: boolean
  readonly svg: boolean
}

export interface RenderContext {
  readonly document: Document
  readonly root: Node
  readonly report: (message: string, near: Node) => void
}

export const DOCUMENT_NODE_TYPE = DOCUMENT_NODE

function describeNode(node: Node | null): string {
  if (node === null) return 'nothing'
  if (node.nodeType === ELEMENT_NODE) return `<${(node as Element).localName}>`
  if (node.nodeType === TEXT_NODE) return 'text'
  if (node.nodeType === COMMENT_NODE) return 'a comment'
  return `node type ${node.nodeType}`
}

export function describePath(node: Node, root: Node): string {
  const names: string[] = []
  for (let current: Node | null = node; current !== null && current !== root; current = current.parentNode) {
    if (current.nodeType === ELEMENT_NODE) names.unshift((current as Element).localName)
  }
  return names.length === 0 ? '(root)' : names.join(' > ')
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return typeof value === 'object' && value !== null && 'then' in value && typeof value.then === 'function'
}

function quote(value: string | null): string {
  return value === null ? 'no value' : JSON.stringify(value)
}

function isFrameworkNode(node: Node): boolean {
  return node.nodeType === ELEMENT_NODE && (node as Element).hasAttribute(FRAMEWORK_ATTRIBUTE)
}

function skipIgnorable(position: Position): void {
  while (position.next !== null && (position.next.nodeType === DOCUMENT_TYPE_NODE || isFrameworkNode(position.next))) position.next = position.next.nextSibling
}

function insertNode(position: Position, node: Node): void {
  position.parent.insertBefore(node, position.next)
}

function replaceStale(position: Position, node: Node): void {
  const stale = position.next
  if (stale !== null) {
    position.next = stale.nextSibling
    position.parent.removeChild(stale)
  }
  position.parent.insertBefore(node, position.next)
}

function removeLeftovers(position: Position, context: RenderContext): void {
  while (position.next !== null) {
    const stale = position.next
    position.next = stale.nextSibling
    if (stale.nodeType === DOCUMENT_TYPE_NODE || isFrameworkNode(stale)) continue
    context.report(`unexpected ${describeNode(stale)} in server markup`, position.parent)
    position.parent.removeChild(stale)
  }
}

function createNode(tag: string, position: Position, context: RenderContext): Element {
  return position.svg || tag === 'svg' ? context.document.createElementNS(SVG_NAMESPACE, tag) : context.document.createElement(tag)
}

function claimElement(tag: string, position: Position, context: RenderContext): { readonly element: Element; readonly adopted: boolean } {
  if (!position.hydrating) {
    const element = createNode(tag, position, context)
    insertNode(position, element)
    return { element, adopted: false }
  }
  skipIgnorable(position)
  const candidate = position.next
  if (candidate !== null && candidate.nodeType === ELEMENT_NODE && (candidate as Element).localName.toLowerCase() === tag.toLowerCase()) {
    position.next = candidate.nextSibling
    return { element: candidate as Element, adopted: true }
  }
  context.report(`expected <${tag}> but found ${describeNode(candidate)}`, position.parent)
  const element = createNode(tag, position, context)
  replaceStale(position, element)
  return { element, adopted: false }
}

function renderText(text: string, position: Position, context: RenderContext): void {
  if (text === '') return
  if (!position.hydrating) {
    insertNode(position, context.document.createTextNode(text))
    return
  }
  skipIgnorable(position)
  const candidate = position.next
  if (candidate !== null && candidate.nodeType === TEXT_NODE) {
    const node = candidate as Text
    if (node.data === text) {
      position.next = node.nextSibling
      return
    }
    if (node.data.startsWith(text)) {
      position.next = node.splitText(text.length)
      return
    }
    context.report(`text expected ${quote(text)} but found ${quote(node.data)}`, position.parent)
    node.data = text
    position.next = node.nextSibling
    return
  }
  context.report(`expected text but found ${describeNode(candidate)}`, position.parent)
  insertNode(position, context.document.createTextNode(text))
}

function renderRaw(html: string, position: Position, context: RenderContext): void {
  const template = context.document.createElement('template') as HTMLTemplateElement
  template.innerHTML = html
  for (const node of Array.from(template.content.childNodes)) {
    if (!position.hydrating) {
      insertNode(position, node)
      continue
    }
    skipIgnorable(position)
    const candidate = position.next
    if (candidate !== null && candidate.isEqualNode(node)) {
      position.next = candidate.nextSibling
      continue
    }
    context.report(`raw HTML differs from server markup (found ${describeNode(candidate)})`, position.parent)
    replaceStale(position, node)
  }
}

function bindEvent(element: Element, name: string, handler: unknown): void {
  if (handler === null || handler === undefined) return
  if (typeof handler !== 'function') throw new TypeError(`Event prop '${name}' must be a function, received ${describeType(handler)}`)
  const type = eventType(name)
  const listener = handler as EventListener
  element.addEventListener(type, listener)
  onCleanup(() => element.removeEventListener(type, listener))
}

function writeAttribute(element: Element, name: string, value: string | true | null, verify: boolean, context: RenderContext): void {
  const expected = value === true ? '' : value
  if (verify) {
    const actual = element.getAttribute(name)
    if (actual !== expected) context.report(`attribute '${name}' expected ${quote(expected)} but found ${quote(actual)}`, element)
  }
  if (expected === null) element.removeAttribute(name)
  else element.setAttribute(name, expected)
  if (PROPERTY_ATTRIBUTES.has(name) && name in element) Reflect.set(element, name, name === 'value' ? (expected ?? '') : expected !== null)
}

function applyProps(element: Element, props: Props, adopted: boolean, context: RenderContext): void {
  for (const name of Object.keys(props)) {
    if (isReservedProp(name)) continue
    if (isEventProp(name)) {
      bindEvent(element, name, props[name])
      continue
    }
    assertAttributeName(name)
    const input = props[name]
    if (typeof input === 'function') {
      const accessor = input as () => unknown
      let verify = adopted
      effect(() => {
        writeAttribute(element, name, normalizeAttribute(name, accessor()), verify, context)
        verify = false
      })
    } else {
      writeAttribute(element, name, normalizeAttribute(name, input), adopted, context)
    }
  }
}

function renderElement(tag: string, props: Props, position: Position, context: RenderContext): void {
  const { element, adopted } = claimElement(tag, position, context)
  applyProps(element, props, adopted, context)
  const childPosition: Position = {
    parent: element,
    next: adopted ? element.firstChild : null,
    hydrating: adopted,
    svg: tag === 'foreignObject' ? false : position.svg || tag === 'svg'
  }
  renderChild(props.children, childPosition, context)
  if (adopted) removeLeftovers(childPosition, context)
  const ref = props['ref']
  if (ref !== undefined && ref !== null) {
    if (typeof ref !== 'function') throw new TypeError("Prop 'ref' must be a function")
    const refElement = ref as (element: Element) => void
    refElement(element)
  }
}

function renderVNode(node: VNode, position: Position, context: RenderContext): void {
  const { type, props } = node
  if (typeof type !== 'function') {
    renderElement(type, props, position, context)
    return
  }
  const component = type as (props: Props) => Child | Promise<Child>
  const result = untrack(() => component(props))
  if (isPromiseLike(result)) throw new TypeError('Async components cannot run in the browser; load data on the server and pass it as props')
  renderChild(result, position, context)
}

function removeBetween(start: Node, end: Node): void {
  let node = start.nextSibling
  while (node !== null && node !== end) {
    const next = node.nextSibling
    node.parentNode?.removeChild(node)
    node = next
  }
}

function renderDynamic(accessor: () => Child, position: Position, context: RenderContext): void {
  const start = context.document.createComment('')
  const end = context.document.createComment('')
  insertNode(position, start)
  let first = true
  effect(() => {
    const value = accessor()
    const dispose = untrack(() =>
      root((disposeRoot) => {
        if (first) {
          renderChild(value, position, context)
          insertNode(position, end)
          return disposeRoot
        }
        const parent = end.parentNode
        if (parent === null) return disposeRoot
        const fragment = context.document.createDocumentFragment()
        renderChild(value, { parent: fragment, next: null, hydrating: false, svg: position.svg }, context)
        removeBetween(start, end)
        parent.insertBefore(fragment, end)
        return disposeRoot
      })
    )
    first = false
    onCleanup(dispose)
  })
}

export function renderChild(child: Child, position: Position, context: RenderContext): void {
  if (child === null || child === undefined || typeof child === 'boolean') return
  if (typeof child === 'string') return renderText(child, position, context)
  if (typeof child === 'number') return renderText(String(child), position, context)
  if (typeof child === 'function') return renderDynamic(child, position, context)
  if (isChildArray(child)) {
    for (const item of child) renderChild(item, position, context)
    return
  }
  if (isRawHtml(child)) return renderRaw(child.html, position, context)
  if (isVNode(child)) return renderVNode(child, position, context)
  throw new TypeError(`Cannot render a value of type ${describeType(child)}`)
}

export function removeAllChildren(node: Node): void {
  while (node.firstChild !== null) node.removeChild(node.firstChild)
}

export { removeLeftovers }