import { describeType } from './util.ts'

const RESERVED_PROPS: ReadonlySet<string> = new Set(['children', 'key', 'ref'])
const RENAMED_PROPS: ReadonlyMap<string, string> = new Map([
  ['className', 'class'],
  ['htmlFor', 'for']
])
const ATTRIBUTE_NAME = /^[A-Za-z_:][-A-Za-z0-9_:.]*$/
const EVENT_PROP = /^on.+/i

/**
 * Props that are never written as attributes: `children`, `key` and `ref`.
 */
export function isReservedProp(name: string): boolean {
  return RESERVED_PROPS.has(name)
}

/**
 * Props starting with `on` (any case) are event handlers, never attributes.
 */
export function isEventProp(name: string): boolean {
  return EVENT_PROP.test(name)
}

/**
 * The DOM event type for an event prop: `onClick` becomes `click`, `onKeyDown` becomes `keydown`.
 */
export function eventType(name: string): string {
  return name.slice(2).toLowerCase()
}

/**
 * Throws for React-style renamed props and for names that are not safe attribute names.
 */
export function assertAttributeName(name: string): void {
  const replacement = RENAMED_PROPS.get(name)
  if (replacement !== undefined) {
    throw new TypeError(`Use '${replacement}' instead of '${name}'`)
  }
  if (!ATTRIBUTE_NAME.test(name)) {
    throw new TypeError(`Invalid attribute name '${name}'`)
  }
}

/**
 * Normalizes an already-resolved attribute value. `null` means omit the attribute,
 * `true` means a bare boolean attribute, a string is the attribute value.
 */
export function normalizeAttribute(name: string, value: unknown): string | true | null {
  if (value === null || value === undefined || value === false) return null
  if (value === true) return true
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  throw new TypeError(`Attribute '${name}' has an unsupported value of type ${describeType(value)}`)
}