import { escapeHtml } from './escape.ts'
import { icons } from './icons.ts'
import type { FlatPage } from './nav.ts'
import { excerpt, search, tokensOf, type Section } from './search.ts'

export interface PaletteOptions {
  readonly dialog: HTMLDialogElement
  readonly pages: readonly FlatPage[]
  readonly loadSections: () => Promise<readonly Section[]>
  readonly go: (hash: string) => void
}

export interface Palette {
  open(): void
}

type Item =
  | {
      readonly kind: 'link'
      readonly href: string
      readonly titleHtml: string
      readonly subtitleHtml: string
      readonly group: string | undefined
      readonly chip: string | undefined
    }
  | { readonly kind: 'query'; readonly query: string; readonly group: string }

const RECENT_KEY = 'gambrel-docs-recent'

function hrefFor(section: Section): string {
  return `#/${section.path}${section.id === '' ? '' : `@${section.id}`}`
}

/**
 * A command palette in the style of shadcn's Command: grouped pages when empty, full-text
 * results with highlighted excerpts when typing, recent searches, and full keyboard control.
 */
export function createPalette(options: PaletteOptions): Palette {
  const { dialog, pages } = options
  dialog.innerHTML =
    `<div class="cmd"><div class="cmd-input">${icons.search}` +
    '<input type="text" placeholder="Search documentation..." autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-label="Search documentation"><kbd>esc</kbd></div>' +
    '<div class="cmd-list" role="listbox"></div>' +
    '<div class="cmd-footer"><span><kbd>↑</kbd><kbd>↓</kbd> navigate</span><span><kbd>↵</kbd> open</span><span><kbd>esc</kbd> close</span></div></div>'

  const input = dialog.querySelector<HTMLInputElement>('.cmd-input input')
  const list = dialog.querySelector<HTMLElement>('.cmd-list')
  if (input === null || list === null) throw new Error('Palette markup is missing')

  const sectionOf = new Map(pages.map((page) => [page.path, page.section]))
  let items: Item[] = []
  let active = 0
  let ticket = 0

  const recents = (): string[] => {
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      const value: unknown = raw === null ? [] : JSON.parse(raw)
      return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === 'string').slice(0, 5) : []
    } catch {
      return []
    }
  }

  const remember = (query: string): void => {
    const trimmed = query.trim()
    if (trimmed === '') return
    const next = [trimmed, ...recents().filter((entry) => entry !== trimmed)].slice(0, 5)
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(next))
    } catch {
      return
    }
  }

  const browseItems = (): Item[] => [
    ...recents().map((query): Item => ({ kind: 'query', query, group: 'Recent searches' })),
    ...pages.map(
      (page): Item => ({
        kind: 'link',
        href: `#/${page.path}`,
        titleHtml: escapeHtml(page.title),
        subtitleHtml: page.summary === undefined ? '' : escapeHtml(page.summary),
        group: page.section,
        chip: undefined
      })
    )
  ]

  const render = (): void => {
    if (items.length === 0) {
      list.innerHTML = '<p class="cmd-empty">No results found.</p>'
      return
    }
    let html = ''
    let group: string | undefined
    items.forEach((item, index) => {
      if (item.group !== undefined && item.group !== group) {
        group = item.group
        html += `<div class="cmd-group">${escapeHtml(group)}</div>`
      }
      const classes = `cmd-item${index === active ? ' active' : ''}`
      if (item.kind === 'query') {
        html +=
          `<button type="button" class="${classes}" role="option" data-index="${index}" aria-selected="${index === active}">` +
          `<span class="cmd-ico">${icons.search}</span><span class="cmd-text"><span class="cmd-title">${escapeHtml(item.query)}</span></span></button>`
      } else {
        html +=
          `<a class="${classes}" role="option" data-index="${index}" aria-selected="${index === active}" href="${escapeHtml(item.href)}">` +
          `<span class="cmd-ico">${icons.file}</span><span class="cmd-text"><span class="cmd-title">${item.titleHtml}</span>` +
          (item.subtitleHtml === '' ? '' : `<span class="cmd-sub">${item.subtitleHtml}</span>`) +
          '</span>' +
          (item.chip === undefined ? '' : `<span class="badge cmd-chip">${escapeHtml(item.chip)}</span>`) +
          '</a>'
      }
    })
    list.innerHTML = html
    list.querySelector('.active')?.scrollIntoView({ block: 'nearest' })
  }

  const highlight = (index: number): void => {
    active = index
    list.querySelectorAll<HTMLElement>('.cmd-item').forEach((element) => {
      const isActive = Number(element.dataset['index']) === index
      element.classList.toggle('active', isActive)
      element.setAttribute('aria-selected', String(isActive))
    })
    list.querySelector('.active')?.scrollIntoView({ block: 'nearest' })
  }

  const update = async (): Promise<void> => {
    const current = ++ticket
    const query = input.value.trim()
    if (query === '') {
      items = browseItems()
      active = 0
      render()
      return
    }
    const sections = await options.loadSections()
    if (current !== ticket) return
    const tokens = tokensOf(query)
    items = search(sections, query, 20).map(
      (hit): Item => ({
        kind: 'link',
        href: hrefFor(hit.section),
        titleHtml:
          escapeHtml(hit.section.docTitle) +
          (hit.section.heading === hit.section.docTitle
            ? ''
            : ` <span class="sep">›</span> ${escapeHtml(hit.section.heading)}`),
        subtitleHtml: excerpt(hit.section.text, tokens),
        group: undefined,
        chip: sectionOf.get(hit.section.path)
      })
    )
    active = 0
    render()
  }

  const choose = (index: number, viaKeyboard: boolean): void => {
    const item = items[index]
    if (item === undefined) return
    if (item.kind === 'query') {
      input.value = item.query
      void update()
      input.focus()
      return
    }
    remember(input.value)
    dialog.close()
    if (viaKeyboard) options.go(item.href)
  }

  input.addEventListener('input', () => void update())
  input.addEventListener('keydown', (event) => {
    if (items.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      highlight((active + 1) % items.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      highlight((active + items.length - 1) % items.length)
    } else if (event.key === 'Home') {
      event.preventDefault()
      highlight(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      highlight(items.length - 1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      choose(active, true)
    }
  })
  list.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const element = event.target.closest<HTMLElement>('[data-index]')
    if (element !== null) choose(Number(element.dataset['index']), false)
  })
  list.addEventListener('mousemove', (event) => {
    if (!(event.target instanceof Element)) return
    const element = event.target.closest<HTMLElement>('[data-index]')
    if (element === null) return
    const index = Number(element.dataset['index'])
    if (index !== active) highlight(index)
  })
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })

  return {
    open() {
      dialog.showModal()
      input.value = ''
      void update()
      input.focus()
    }
  }
}