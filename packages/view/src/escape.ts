const TEXT_PATTERN = /[&<>]/g
const ATTRIBUTE_PATTERN = /[&<>"']/g

const ENTITIES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}

function replaceEntity(character: string): string {
  return ENTITIES[character] ?? character
}

/**
 * Escapes `& < >` for use as HTML text content.
 */
export function escapeText(value: string): string {
  return value.replace(TEXT_PATTERN, replaceEntity)
}

/**
 * Escapes `& < > " '` for use inside a double-quoted HTML attribute value.
 */
export function escapeAttribute(value: string): string {
  return value.replace(ATTRIBUTE_PATTERN, replaceEntity)
}