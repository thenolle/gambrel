/**
 * Estimated reading time in whole minutes (at least one). Code blocks are not counted.
 */
export function readingMinutes(html: string): number {
  const text = html.replace(/<figure[\s\S]*?<\/figure>/g, ' ').replace(/<[^>]*>/g, ' ')
  const words = text.split(/\s+/).filter((word) => word !== '').length
  return Math.max(1, Math.round(words / 200))
}