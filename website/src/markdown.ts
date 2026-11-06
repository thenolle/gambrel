import { escapeHtml, unescapeHtml } from './escape.ts'
import { highlight } from './highlight.ts'

export interface Heading {
  readonly level: number
  readonly id: string
  readonly text: string
}

export interface Rendered {
  readonly html: string
  readonly headings: readonly Heading[]
  readonly title: string
}

export interface RenderOptions {
  /**
   * Path of the document being rendered, relative to `docs/` and without `.md`.
   */
  readonly docPath: string
}

interface Context {
  readonly docPath: string
  readonly headings: Heading[]
  readonly used: Map<string, number>
}

interface Item {
  readonly lines: string[]
  readonly offset: number
}

const FENCE = /^ {0,3}(`{3,}|~{3,})\s*(.*)$/
const HEADING = /^(#{1,4})\s+(.+?)(?:\s+#+)?\s*$/
const RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/
const QUOTE = /^\s{0,3}>/
const LIST = /^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/
const TABLE_SEPARATOR = /^\s*\|?\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)*\|?\s*$/

export { escapeHtml }

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
  return slug === '' ? 'section' : slug
}

function isSafeUrl(url: string): boolean {
  return !/^\s*(?:javascript|data|vbscript):/i.test(url)
}

/**
 * Converts a Markdown link to another document (`./routing.md#params`) into a site hash
 * link (`#/guides/routing@params`), resolved against the current document's directory.
 * Other links are returned unchanged.
 */
export function resolveDocLink(href: string, docPath: string): string {
  const match = /^([^#?]*)\.md(#.*)?$/.exec(href)
  if (match === null || /^[a-z][a-z0-9+.-]*:/i.test(href)) return href
  const target = match[1] ?? ''
  const parts = target.startsWith('/') ? [] : docPath.split('/').slice(0, -1)
  for (const part of target.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') parts.pop()
    else parts.push(part)
  }
  const anchor = match[2] === undefined ? '' : `@${match[2].slice(1)}`
  return `#/${parts.join('/')}${anchor}`
}

function renderLink(label: string, href: string, docPath: string): string {
  if (!isSafeUrl(href)) return label
  let target = resolveDocLink(href, docPath)
  if (target.startsWith('#') && !target.startsWith('#/')) target = `#/${docPath}@${target.slice(1)}`
  const external = /^https?:\/\//i.test(target)
  const attributes = external ? ' class="external" target="_blank" rel="noopener noreferrer"' : ''
  return `<a href="${escapeHtml(target)}"${attributes}>${label}</a>`
}

function renderInline(source: string, docPath: string): string {
  const codes: string[] = []
  let text = source.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_match, _ticks: string, code: string) => {
    codes.push(`<code>${escapeHtml(code.trim())}</code>`)
    return `\u0000${codes.length - 1}\u0000`
  })
  text = escapeHtml(text)
  text = text.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_match, alt: string, src: string) =>
    isSafeUrl(unescapeHtml(src)) ? `<img src="${src}" alt="${alt}" loading="lazy">` : alt
  )
  text = text.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_match, label: string, href: string) =>
    renderLink(label, unescapeHtml(href), docPath)
  )
  text = text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g, '$1<em>$2</em>')
    .replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return text.replace(/\u0000(\d+)\u0000/g, (_match, index: string) => codes[Number(index)] ?? '')
}

function plain(text: string): string {
  return text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_~]/g, '').trim()
}

function uniqueId(base: string, context: Context): string {
  const count = context.used.get(base) ?? 0
  context.used.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

function renderCode(code: string, lang: string, title: string | undefined): string {
  const label = lang === '' ? 'text' : lang
  const caption =
    `<figcaption><span class="code-title">${title === undefined ? '' : escapeHtml(title)}</span>` +
    `<span class="code-lang">${escapeHtml(label)}</span>` +
    '<button class="copy" type="button" aria-label="Copy code">Copy</button></figcaption>'
  return `<figure class="code" data-lang="${escapeHtml(label)}">${caption}<pre><code>${highlight(code, lang)}</code></pre></figure>`
}

function splitRow(line: string): string[] {
  let row = line.trim()
  if (row.startsWith('|')) row = row.slice(1)
  if (row.endsWith('|') && !row.endsWith('\\|')) row = row.slice(0, -1)
  return row.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'))
}

function alignOf(cell: string): string | undefined {
  const text = cell.trim()
  if (text.startsWith(':') && text.endsWith(':')) return 'c'
  return text.endsWith(':') ? 'r' : undefined
}

function renderTable(header: string[], aligns: (string | undefined)[], rows: string[][], docPath: string): string {
  const cell = (tag: 'th' | 'td', text: string, index: number): string => {
    const align = aligns[index]
    return `<${tag}${align === undefined ? '' : ` class="al-${align}"`}>${renderInline(text, docPath)}</${tag}>`
  }
  const head = `<thead><tr>${header.map((text, index) => cell('th', text, index)).join('')}</tr></thead>`
  const body = rows.map((row) => `<tr>${header.map((_h, index) => cell('td', row[index] ?? '', index)).join('')}</tr>`)
  return `<div class="table-wrap"><table>${head}<tbody>${body.join('')}</tbody></table></div>`
}

function isTableStart(line: string, next: string | undefined): boolean {
  return line.includes('|') && next !== undefined && TABLE_SEPARATOR.test(next)
}

function startsBlock(line: string, next: string | undefined): boolean {
  return (
    FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || LIST.test(line) || isTableStart(line, next)
  )
}

function renderList(lines: readonly string[], start: number, context: Context): { html: string; next: number } {
  const first = LIST.exec(lines[start] ?? '')
  const baseIndent = (first?.[1] ?? '').length
  const ordered = /^\d/.test(first?.[2] ?? '')
  const items: Item[] = []
  let index = start

  while (index < lines.length) {
    const line = lines[index] ?? ''
    const indent = line.length - line.trimStart().length
    const marker = LIST.exec(line)
    if (marker !== null && indent === baseIndent && /^\d/.test(marker[2] ?? '') === ordered) {
      const content = marker[3] ?? ''
      items.push({ lines: [content], offset: line.length - content.length })
      index += 1
      continue
    }
    const current = items[items.length - 1]
    if (current === undefined) break
    if (line.trim() === '') {
      let probe = index + 1
      while (probe < lines.length && (lines[probe] ?? '').trim() === '') probe += 1
      const probeLine = lines[probe] ?? ''
      const probeIndent = probeLine.length - probeLine.trimStart().length
      const continues = probe < lines.length && (probeIndent > baseIndent || (LIST.test(probeLine) && probeIndent === baseIndent))
      if (!continues) break
      current.lines.push('')
      index += 1
      continue
    }
    if (indent <= baseIndent) break
    current.lines.push(line.slice(Math.min(indent, current.offset)))
    index += 1
  }

  const tag = ordered ? 'ol' : 'ul'
  const html = items
    .map((item) => {
      const lines = [...item.lines]
      let prefix = ''
      const task = /^\[( |x|X)\]\s+/.exec(lines[0] ?? '')
      if (task !== null) {
        prefix = `<input type="checkbox" disabled${task[1] === ' ' ? '' : ' checked'}> `
        lines[0] = (lines[0] ?? '').slice(task[0].length)
      }
      const body = renderBlocks(lines, context).replace(/^<p>([\s\S]*?)<\/p>/, '$1')
      return `<li>${prefix}${body}</li>`
    })
    .join('')
  return { html: `<${tag}>${html}</${tag}>`, next: index }
}

function renderBlocks(lines: readonly string[], context: Context): string {
  const out: string[] = []
  let index = 0

  while (index < lines.length) {
    const line = lines[index] ?? ''
    if (line.trim() === '') {
      index += 1
      continue
    }

    const fence = FENCE.exec(line)
    if (fence !== null) {
      const marker = fence[1] ?? '```'
      const info = fence[2] ?? ''
      const code: string[] = []
      index += 1
      while (index < lines.length) {
        const candidate = (lines[index] ?? '').trim()
        if (candidate.length >= marker.length && candidate === marker.charAt(0).repeat(candidate.length)) break
        code.push(lines[index] ?? '')
        index += 1
      }
      index += 1
      const lang = info.split(/\s+/)[0] ?? ''
      const title = /title="([^"]*)"/.exec(info)?.[1]
      out.push(renderCode(code.join('\n'), lang, title))
      continue
    }

    const heading = HEADING.exec(line)
    if (heading !== null) {
      const level = (heading[1] ?? '#').length
      const raw = heading[2] ?? ''
      const text = plain(raw)
      const id = uniqueId(slugify(text), context)
      context.headings.push({ level, id, text })
      out.push(
        `<h${level} id="${id}">${renderInline(raw, context.docPath)}` +
          `<a class="anchor" href="#/${escapeHtml(context.docPath)}@${id}" aria-label="Link to ${escapeHtml(text)}">#</a></h${level}>`
      )
      index += 1
      continue
    }

    if (RULE.test(line)) {
      out.push('<hr>')
      index += 1
      continue
    }

    if (isTableStart(line, lines[index + 1])) {
      const header = splitRow(line)
      const aligns = splitRow(lines[index + 1] ?? '').map(alignOf)
      const rows: string[][] = []
      index += 2
      while (index < lines.length && (lines[index] ?? '').trim() !== '' && (lines[index] ?? '').includes('|')) {
        rows.push(splitRow(lines[index] ?? ''))
        index += 1
      }
      out.push(renderTable(header, aligns, rows, context.docPath))
      continue
    }

    if (QUOTE.test(line)) {
      const inner: string[] = []
      while (index < lines.length && QUOTE.test(lines[index] ?? '')) {
        inner.push((lines[index] ?? '').replace(/^\s{0,3}>\s?/, ''))
        index += 1
      }
      const callout = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*$/i.exec(inner[0] ?? '')
      if (callout !== null) {
        const kind = (callout[1] ?? 'NOTE').toLowerCase()
        const title = kind.charAt(0).toUpperCase() + kind.slice(1)
        out.push(
          `<aside class="callout callout-${kind}"><p class="callout-title">${title}</p>${renderBlocks(inner.slice(1), context)}</aside>`
        )
      } else {
        out.push(`<blockquote>${renderBlocks(inner, context)}</blockquote>`)
      }
      continue
    }

    if (LIST.test(line)) {
      const list = renderList(lines, index, context)
      out.push(list.html)
      index = list.next
      continue
    }

    const paragraph = [line]
    index += 1
    while (index < lines.length && (lines[index] ?? '').trim() !== '' && !startsBlock(lines[index] ?? '', lines[index + 1])) {
      paragraph.push(lines[index] ?? '')
      index += 1
    }
    out.push(`<p>${renderInline(paragraph.join('\n'), context.docPath)}</p>`)
  }

  return out.join('\n')
}

/**
 * Renders Markdown to safe HTML. Raw HTML in the source is escaped, `javascript:` links
 * are dropped, and code blocks are syntax-highlighted. Supports headings, emphasis, inline
 * code, links, images, lists (nested, ordered, task), tables, blockquotes, fenced code with
 * `title="..."`, and callouts written as `> [!NOTE]`.
 */
export function renderMarkdown(source: string, options: RenderOptions): Rendered {
  const context: Context = { docPath: options.docPath, headings: [], used: new Map() }
  const html = renderBlocks(source.replace(/\r\n?/g, '\n').split('\n'), context)
  const title = context.headings.find((heading) => heading.level === 1)?.text ?? ''
  return { html, headings: context.headings, title }
}