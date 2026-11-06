import { escapeHtml, unescapeHtml } from './escape.ts'

export interface Section {
  readonly path: string
  readonly docTitle: string
  readonly heading: string
  readonly id: string
  readonly text: string
}

export interface Hit {
  readonly section: Section
  readonly score: number
}

function stripTags(html: string): string {
  return unescapeHtml(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

/**
 * Splits rendered HTML into searchable sections at each h1 to h3 heading.
 */
export function sectionsOf(path: string, docTitle: string, html: string): Section[] {
  return html.split(/(?=<h[1-3] id=")/).map((part) => {
    const heading = /^<h[1-3] id="([^"]+)">([\s\S]*?)<a class="anchor"/.exec(part)
    const body = part.replace(/<h[1-3][^>]*>[\s\S]*?<\/h[1-3]>/, '')
    return {
      path,
      docTitle,
      heading: heading === null ? docTitle : stripTags(heading[2] ?? ''),
      id: heading?.[1] ?? '',
      text: stripTags(body)
    }
  })
}

export function tokensOf(query: string): string[] {
  return query.toLowerCase().split(/\s+/).filter((token) => token !== '')
}

/**
 * Every query word must appear in the section. Heading matches rank above title matches,
 * which rank above body matches.
 */
export function search(sections: readonly Section[], query: string, limit = 12): Hit[] {
  const tokens = tokensOf(query)
  if (tokens.length === 0) return []
  const hits: Hit[] = []
  for (const section of sections) {
    const heading = section.heading.toLowerCase()
    const title = section.docTitle.toLowerCase()
    const text = section.text.toLowerCase()
    let score = 0
    let matched = true
    for (const token of tokens) {
      const inHeading = heading.includes(token)
      const inTitle = title.includes(token)
      const inText = text.split(token).length - 1
      if (!inHeading && !inTitle && inText === 0) {
        matched = false
        break
      }
      score += (inHeading ? 10 : 0) + (inTitle ? 4 : 0) + Math.min(inText, 5)
    }
    if (matched) hits.push({ section, score })
  }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * A short plain-text snippet around the first matching word, with matches wrapped in
 * `<mark>`. The result is HTML-safe.
 */
export function excerpt(text: string, tokens: readonly string[], radius = 70): string {
  const lower = text.toLowerCase()
  const positions = tokens.map((token) => lower.indexOf(token)).filter((position) => position >= 0)
  const first = positions.length === 0 ? 0 : Math.min(...positions)
  const start = Math.max(0, first - radius)
  const slice = text.slice(start, start + radius * 2)
  let html = escapeHtml(`${start > 0 ? '...' : ''}${slice}${start + radius * 2 < text.length ? '...' : ''}`)
  for (const token of tokens) {
    const pattern = new RegExp(escapeHtml(token).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
    html = html.replace(pattern, (match) => `<mark>${match}</mark>`)
  }
  return html
}