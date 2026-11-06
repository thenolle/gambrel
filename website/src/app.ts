import { escapeHtml, renderMarkdown, type Rendered } from './markdown.ts'
import { excerpt, search, sectionsOf, tokensOf, type Hit, type Section } from './search.ts'

interface NavPage {
  readonly title: string
  readonly path: string
  readonly summary: string | undefined
}

interface NavSection {
  readonly title: string
  readonly pages: readonly NavPage[]
}

interface Nav {
  readonly title: string
  readonly repo: string
  readonly sections: readonly NavSection[]
}

const THEME_KEY = 'gambrel-docs-theme'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function parseNav(value: unknown): Nav {
  const invalid = new Error(
    'docs/nav.json is invalid: expected { title, repo, sections: [{ title, pages: [{ title, path }] }] }'
  )
  if (!isRecord(value) || typeof value['title'] !== 'string' || typeof value['repo'] !== 'string') throw invalid
  const rawSections = value['sections']
  if (!Array.isArray(rawSections)) throw invalid
  const sections = rawSections.map((section: unknown): NavSection => {
    if (!isRecord(section) || typeof section['title'] !== 'string' || !Array.isArray(section['pages'])) throw invalid
    const pages = section['pages'].map((page: unknown): NavPage => {
      if (!isRecord(page) || typeof page['title'] !== 'string' || typeof page['path'] !== 'string') throw invalid
      return {
        title: page['title'],
        path: page['path'],
        summary: typeof page['summary'] === 'string' ? page['summary'] : undefined
      }
    })
    return { title: section['title'], pages }
  })
  return { title: value['title'], repo: value['repo'], sections }
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id)
  if (element === null) throw new Error(`Missing #${id} in index.html`)
  return element as T
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`)
  return response.text()
}

function parseHash(): { path: string; anchor: string | undefined } {
  let hash = location.hash.replace(/^#\/?/, '')
  try {
    hash = decodeURIComponent(hash)
  } catch {
    hash = ''
  }
  const [path = '', anchor] = hash.split('@')
  return { path, anchor: anchor === '' ? undefined : anchor }
}

async function main(): Promise<void> {
  const content = byId<HTMLElement>('content')
  const sidebar = byId<HTMLElement>('sidebar')
  const toc = byId<HTMLElement>('toc')
  const dialog = byId<HTMLDialogElement>('search')
  const input = byId<HTMLInputElement>('search-input')
  const results = byId<HTMLElement>('search-results')
  const themeButton = byId<HTMLButtonElement>('theme')

  const nav = parseNav(JSON.parse(await fetchText('docs/nav.json')))
  const pages = nav.sections.flatMap((section) => section.pages.map((page) => ({ ...page, section: section.title })))
  const byPath = new Map(pages.map((page) => [page.path, page]))
  byId<HTMLAnchorElement>('repo').href = nav.repo

  const applyTheme = (theme: 'light' | 'dark'): void => {
    document.documentElement.dataset['theme'] = theme
    themeButton.textContent = theme === 'dark' ? 'Light' : 'Dark'
    try {
      localStorage.setItem(THEME_KEY, theme)
    } catch {
      return
    }
  }
  themeButton.textContent = document.documentElement.dataset['theme'] === 'dark' ? 'Light' : 'Dark'
  themeButton.addEventListener('click', () =>
    applyTheme(document.documentElement.dataset['theme'] === 'dark' ? 'light' : 'dark')
  )

  const sources = new Map<string, Promise<string>>()
  const loadSource = (path: string): Promise<string> => {
    let pending = sources.get(path)
    if (pending === undefined) {
      pending = fetchText(`docs/${path}.md`)
      sources.set(path, pending)
      pending.catch(() => {
        sources.delete(path)
      })
    }
    return pending
  }

  const renderedPages = new Map<string, Rendered>()
  const renderPage = async (path: string): Promise<Rendered> => {
    const cached = renderedPages.get(path)
    if (cached !== undefined) return cached
    const rendered = renderMarkdown(await loadSource(path), { docPath: path })
    renderedPages.set(path, rendered)
    return rendered
  }

  sidebar.innerHTML = nav.sections
    .map(
      (section) =>
        `<section class="nav-section"><h2>${escapeHtml(section.title)}</h2><ul>` +
        section.pages
          .map(
            (page) =>
              `<li><a href="#/${escapeHtml(page.path)}" data-path="${escapeHtml(page.path)}">${escapeHtml(page.title)}</a></li>`
          )
          .join('') +
        '</ul></section>'
    )
    .join('')
  sidebar.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a') !== null) {
      document.body.classList.remove('nav-open')
    }
  })
  byId('menu').addEventListener('click', () => document.body.classList.toggle('nav-open'))

  let observer: IntersectionObserver | undefined
  const buildToc = (path: string, doc: Rendered): void => {
    observer?.disconnect()
    const entries = doc.headings.filter((heading) => heading.level === 2 || heading.level === 3)
    toc.innerHTML =
      entries.length === 0
        ? ''
        : '<h2>On this page</h2><ul>' +
          entries
            .map(
              (heading) =>
                `<li><a href="#/${escapeHtml(path)}@${heading.id}" data-id="${heading.id}" data-level="${heading.level}">${escapeHtml(heading.text)}</a></li>`
            )
            .join('') +
          '</ul>'
    observer = new IntersectionObserver(
      (observed) => {
        for (const entry of observed) {
          if (!entry.isIntersecting) continue
          toc.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
            link.classList.toggle('active', link.dataset['id'] === entry.target.id)
          })
        }
      },
      { rootMargin: '-72px 0px -70% 0px' }
    )
    content.querySelectorAll<HTMLElement>('h2[id], h3[id]').forEach((heading) => observer?.observe(heading))
  }

  const scrollToAnchor = (anchor: string | undefined): void => {
    if (anchor === undefined) {
      window.scrollTo(0, 0)
      return
    }
    content.querySelector(`[id="${CSS.escape(anchor)}"]`)?.scrollIntoView()
  }

  let currentPath: string | undefined
  let navigation = 0
  const show = async (path: string, anchor: string | undefined): Promise<void> => {
    const token = ++navigation
    const page = byPath.get(path)
    if (page === undefined) {
      currentPath = undefined
      content.innerHTML =
        `<article class="doc"><h1>Page not found</h1><p>There is no page at <code>${escapeHtml(path)}</code>.</p>` +
        '<p><a href="#/">Back to the start</a></p></article>'
      toc.innerHTML = ''
      document.title = `Not found · ${nav.title}`
      return
    }
    sidebar.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
      link.classList.toggle('active', link.dataset['path'] === path)
    })
    if (path === currentPath) {
      scrollToAnchor(anchor)
      return
    }
    try {
      const doc = await renderPage(path)
      if (token !== navigation) return
      currentPath = path
      const position = pages.findIndex((candidate) => candidate.path === path)
      const previous = pages[position - 1]
      const next = pages[position + 1]
      const pagerLink = (target: typeof previous, kind: 'previous' | 'next'): string =>
        target === undefined
          ? '<span></span>'
          : `<a class="${kind === 'next' ? 'next' : 'prev'}" href="#/${escapeHtml(target.path)}"><small>${kind === 'next' ? 'Next' : 'Previous'}</small>${escapeHtml(target.title)}</a>`
      content.innerHTML =
        `<nav class="breadcrumb"><a href="#/">Docs</a> › ${escapeHtml(page.section)} › ${escapeHtml(page.title)}</nav>` +
        `<article class="doc">${doc.html}</article>` +
        `<div class="pager">${pagerLink(previous, 'previous')}${pagerLink(next, 'next')}</div>` +
        `<p class="edit"><a href="${escapeHtml(nav.repo)}/blob/master/docs/${escapeHtml(path)}.md" target="_blank" rel="noopener noreferrer">Edit this page on GitHub</a></p>`
      document.title = `${doc.title === '' ? page.title : doc.title} · ${nav.title}`
      buildToc(path, doc)
      scrollToAnchor(anchor)
    } catch (error) {
      if (token !== navigation) return
      content.innerHTML = `<article class="doc"><h1>Could not load this page</h1><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p></article>`
    }
  }

  content.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const button = event.target.closest<HTMLButtonElement>('button.copy')
    if (button === null) return
    const code = button.closest('figure')?.querySelector('pre code')?.textContent ?? ''
    navigator.clipboard
      .writeText(code)
      .then(
        () => {
          button.textContent = 'Copied'
        },
        () => {
          button.textContent = 'Press Ctrl+C'
        }
      )
      .finally(() => {
        setTimeout(() => {
          button.textContent = 'Copy'
        }, 1500)
      })
  })

  let index: readonly Section[] | undefined
  const ensureIndex = async (): Promise<readonly Section[]> => {
    if (index === undefined) {
      const lists = await Promise.all(
        pages.map(async (page): Promise<Section[]> => {
          try {
            return sectionsOf(page.path, page.title, (await renderPage(page.path)).html)
          } catch {
            return []
          }
        })
      )
      index = lists.flat()
    }
    return index
  }

  let hits: Hit[] = []
  let active = 0
  const hitHref = (section: Section): string => `#/${section.path}${section.id === '' ? '' : `@${section.id}`}`
  const renderHits = (): void => {
    if (input.value.trim() === '') {
      results.innerHTML = ''
      return
    }
    const tokens = tokensOf(input.value)
    results.innerHTML =
      hits.length === 0
        ? '<p class="empty">No results.</p>'
        : hits
            .map((hit, position) => {
              const heading = hit.section.heading === hit.section.docTitle ? '' : ` › ${escapeHtml(hit.section.heading)}`
              return (
                `<a class="hit${position === active ? ' active' : ''}" href="${escapeHtml(hitHref(hit.section))}" role="option">` +
                `<strong>${escapeHtml(hit.section.docTitle)}${heading}</strong><span>${excerpt(hit.section.text, tokens)}</span></a>`
              )
            })
            .join('')
  }
  const runSearch = async (): Promise<void> => {
    hits = search(await ensureIndex(), input.value)
    active = 0
    renderHits()
  }
  const openSearch = (): void => {
    dialog.showModal()
    input.select()
    void ensureIndex()
  }
  input.addEventListener('input', () => void runSearch())
  input.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (hits.length === 0) return
      active = (active + (event.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length
      renderHits()
      results.querySelector('.active')?.scrollIntoView({ block: 'nearest' })
    } else if (event.key === 'Enter') {
      const hit = hits[active]
      if (hit === undefined) return
      event.preventDefault()
      location.hash = hitHref(hit.section)
      dialog.close()
    }
  })
  results.addEventListener('click', () => dialog.close())
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close()
  })
  byId('open-search').addEventListener('click', openSearch)
  document.addEventListener('keydown', (event) => {
    const typing =
      event.target instanceof HTMLElement && (event.target.tagName === 'INPUT' || event.target.isContentEditable)
    const shortcut = (event.key === '/' && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')
    if (!shortcut) return
    event.preventDefault()
    if (!dialog.open) openSearch()
  })

  const route = (): void => {
    const { path, anchor } = parseHash()
    void show(path === '' ? (pages[0]?.path ?? '') : path, anchor)
  }
  window.addEventListener('hashchange', route)
  route()
}

main().catch((error: unknown) => {
  const content = document.getElementById('content')
  if (content === null) return
  content.innerHTML = `<article class="doc"><h1>Documentation failed to load</h1><p>${escapeHtml(error instanceof Error ? error.message : String(error))}</p></article>`
})