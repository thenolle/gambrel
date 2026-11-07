import { byId, fetchText, isTyping, modifierKey } from './dom.ts'
import { escapeHtml } from './escape.ts'
import { icons } from './icons.ts'
import { renderLanding } from './landing.ts'
import { renderMarkdown, type Rendered } from './markdown.ts'
import { flatten, parseNav, type FlatPage } from './nav.ts'
import { createPalette } from './palette.ts'
import { readingMinutes } from './reading.ts'
import { sectionsOf, type Section } from './search.ts'
import { applyTheme, readChoice, type ThemeChoice } from './theme.ts'
import { installStaticNavigation, readDocLocation } from './static-navigation.ts'

const SKELETON = '<div class="doc"><div class="skeleton title"></div><div class="skeleton"></div><div class="skeleton short"></div><div class="skeleton"></div></div>'

function parseHash(): { path: string; anchor: string | undefined } {
  return readDocLocation()
}

async function copyWithFeedback(button: HTMLElement, text: string, idle: string, done: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    button.innerHTML = done
  } catch {
    button.innerHTML = idle
    return
  }
  setTimeout(() => {
    button.innerHTML = idle
  }, 1500)
}

async function main(): Promise<void> {
  const nav = parseNav(JSON.parse(await fetchText('docs/nav.json')))
  const pages = flatten(nav)
  const byPath = new Map(pages.map((page) => [page.path, page]))
  const mod = modifierKey()
  const content = byId('content')
  const sidebar = byId('sidebar')
  const toc = byId('toc')
  const progress = byId('progress')
  const toTop = byId<HTMLButtonElement>('to-top')
  const overlay = byId('overlay')
  const themeButton = byId<HTMLButtonElement>('theme')
  const themeMenu = byId('theme-menu')
  const quick = byId('quick')
  const searchDialog = byId<HTMLDialogElement>('search')
  const shortcutsDialog = byId<HTMLDialogElement>('shortcuts')
  byId('menu').innerHTML = icons.menu
  toTop.innerHTML = icons.arrowUp
  byId('open-search').innerHTML = `${icons.search}<span>Search documentation...</span><kbd>${mod} K</kbd>`
  const repo = byId<HTMLAnchorElement>('repo')
  repo.href = nav.repo
  repo.innerHTML = `<span>GitHub</span>${icons.external}`
  quick.innerHTML = nav.sections.flatMap((section) => {
    const first = section.pages[0]
    if (first === undefined) return []
    return [`<a href="#/${escapeHtml(first.path)}" data-section="${escapeHtml(section.title)}">${escapeHtml(section.title)}</a>`]
  }).join('')
  sidebar.innerHTML = nav.sections.map(
    (section) =>
      `<section class="nav-section"><h2>${escapeHtml(section.title)}</h2><ul>` +
      section.pages.map((page) => `<li><a href="#/${escapeHtml(page.path)}" data-path="${escapeHtml(page.path)}">${escapeHtml(page.title)}</a></li>`).join('') +
      '</ul></section>'
  ).join('')
  const closeNav = (): void => {
    document.body.classList.remove('nav-open')
    overlay.hidden = true
    byId('menu').setAttribute('aria-expanded', 'false')
  }
  byId('menu').addEventListener('click', () => {
    const open = document.body.classList.toggle('nav-open')
    overlay.hidden = !open
    byId('menu').setAttribute('aria-expanded', String(open))
  })
  overlay.addEventListener('click', closeNav)
  sidebar.addEventListener('click', (event) => {
    if (event.target instanceof Element && event.target.closest('a') !== null) closeNav()
  })
  const renderThemeMenu = (): void => {
    const choice = readChoice()
    themeButton.innerHTML = document.documentElement.dataset['theme'] === 'dark' ? icons.moon : icons.sun
    const entries: Array<[ThemeChoice, string]> = [
      ['light', icons.sun],
      ['dark', icons.moon],
      ['system', icons.monitor]
    ]
    themeMenu.innerHTML = entries.map(([value, icon]) =>
      `<button type="button" role="menuitemradio" aria-checked="${value === choice}" data-theme-choice="${value}">` +
      `${icon}<span>${value.charAt(0).toUpperCase()}${value.slice(1)}</span>${value === choice ? icons.check : ''}</button>`
    ).join('')
  }
  const setThemeMenu = (open: boolean): void => {
    themeMenu.hidden = !open
    themeButton.setAttribute('aria-expanded', String(open))
  }
  renderThemeMenu()
  themeButton.addEventListener('click', (event) => {
    event.stopPropagation()
    setThemeMenu(!themeMenu.hidden)
  })
  themeMenu.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const option = event.target.closest<HTMLElement>('[data-theme-choice]')
    const value = option?.dataset['themeChoice']
    if (value !== 'light' && value !== 'dark' && value !== 'system') return
    applyTheme(value)
    renderThemeMenu()
    setThemeMenu(false)
  })
  document.addEventListener('click', (event) => {
    if (themeMenu.hidden || !(event.target instanceof Node)) return
    if (!themeMenu.contains(event.target) && !themeButton.contains(event.target)) setThemeMenu(false)
  })
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readChoice() !== 'system') return
    applyTheme('system')
    renderThemeMenu()
  })
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
  sidebar.addEventListener('pointerover', (event) => {
    if (!(event.target instanceof Element)) return
    const path = event.target.closest<HTMLElement>('[data-path]')?.dataset['path']
    if (path !== undefined) loadSource(path).catch(() => undefined)
  })
  let sectionIndex: Promise<readonly Section[]> | undefined
  const loadSections = (): Promise<readonly Section[]> => {
    sectionIndex ??= Promise.all(
      pages.map(async (page): Promise<Section[]> => {
        try {
          return sectionsOf(page.path, page.title, (await renderPage(page.path)).html)
        } catch {
          return []
        }
      })
    ).then((lists) => lists.flat())
    return sectionIndex
  }
  const palette = createPalette({
    dialog: searchDialog,
    pages,
    loadSections,
    go: (hash) => {
      location.hash = hash
    }
  })
  byId('open-search').addEventListener('click', () => palette.open())
  shortcutsDialog.innerHTML =
    '<div class="dialog-card"><h2>Keyboard shortcuts</h2><dl>' +
    `<dt>Search</dt><dd><kbd>/</kbd><kbd>${mod}</kbd><kbd>K</kbd></dd>` +
    '<dt>Previous page</dt><dd><kbd>[</kbd></dd><dt>Next page</dt><dd><kbd>]</kbd></dd>' +
    '<dt>Show shortcuts</dt><dd><kbd>?</kbd></dd><dt>Close dialogs</dt><dd><kbd>esc</kbd></dd></dl></div>'
  shortcutsDialog.addEventListener('click', (event) => {
    if (event.target === shortcutsDialog) shortcutsDialog.close()
  })
  const enhance = (): void => {
    content.querySelectorAll<HTMLButtonElement>('button.copy').forEach((button) => {
      button.innerHTML = icons.copy
    })
    content.querySelectorAll<HTMLElement>('figure.code').forEach((figure) => {
      const pre = figure.querySelector('pre')
      if (pre === null || pre.scrollHeight <= 480) return
      const lines = (pre.textContent ?? '').split('\n').length
      figure.classList.add('collapsed')
      figure.insertAdjacentHTML('beforeend', `<button type="button" class="expand">Show all ${lines} lines</button>`)
    })
  }
  let observer: IntersectionObserver | undefined
  const buildToc = (path: string, doc: Rendered): void => {
    observer?.disconnect()
    const entries = doc.headings.filter((heading) => heading.level === 2 || heading.level === 3)
    toc.innerHTML = entries.length === 0 ? '' : '<h2>On This Page</h2><ul>' + entries.map((heading) => `<li><a href="#/${escapeHtml(path)}@${heading.id}" data-id="${heading.id}" data-level="${heading.level}">${escapeHtml(heading.text)}</a></li>`).join('') + '</ul>'
    observer = new IntersectionObserver((observed) => {
      for (const entry of observed) {
        if (!entry.isIntersecting) continue
        toc.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
          link.classList.toggle('active', link.dataset['id'] === entry.target.id)
        })
      }
    }, { rootMargin: '-72px 0px -70% 0px' })
    content.querySelectorAll<HTMLElement>('h2[id], h3[id]').forEach((heading) => observer?.observe(heading))
  }
  const setActive = (page: FlatPage | undefined): void => {
    sidebar.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
      link.classList.toggle('active', page !== undefined && link.dataset['path'] === page.path)
    })
    quick.querySelectorAll<HTMLAnchorElement>('a').forEach((link) => {
      link.classList.toggle('active', page !== undefined && link.dataset['section'] === page.section)
    })
    if (page !== undefined) sidebar.querySelector('a.active')?.scrollIntoView({ block: 'nearest' })
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
  const showLanding = (): void => {
    navigation += 1
    currentPath = undefined
    document.body.dataset['view'] = 'landing'
    content.innerHTML = renderLanding(nav)
    toc.innerHTML = ''
    document.title = `${nav.title} documentation`
    setActive(undefined)
    enhance()
    window.scrollTo(0, 0)
  }
  const show = async (path: string, anchor: string | undefined): Promise<void> => {
    const token = ++navigation
    const page = byPath.get(path)
    document.body.dataset['view'] = 'doc'
    if (page === undefined) {
      currentPath = undefined
      content.innerHTML =
        `<div class="doc"><h1>Page not found</h1><p>There is no page at <code>${escapeHtml(path)}</code>.</p>` +
        '<p><a href="#/">Back to the start</a></p></div>'
      toc.innerHTML = ''
      document.title = `Not found · ${nav.title}`
      setActive(undefined)
      return
    }
    setActive(page)
    if (path === currentPath) {
      scrollToAnchor(anchor)
      return
    }
    if (!renderedPages.has(path) && document.body.dataset['docPage'] !== path) content.innerHTML = SKELETON
    try {
      const doc = await renderPage(path)
      if (token !== navigation) return
      currentPath = path
      const position = pages.findIndex((candidate) => candidate.path === path)
      const previous = pages[position - 1]
      const next = pages[position + 1]
      const card = (target: FlatPage | undefined, kind: 'prev' | 'next'): string => target === undefined ? '' : `<a class="pager-card ${kind}" href="#/${escapeHtml(target.path)}"><span class="pager-label">` + (kind === 'prev' ? `${icons.arrowLeft}Previous` : `Next${icons.arrowRight}`) + `</span><span class="pager-title">${escapeHtml(target.title)}</span></a>`
      content.innerHTML =
        '<div class="page-head">' +
        `<nav class="breadcrumb" aria-label="Breadcrumb"><a href="#/">Docs</a>${icons.chevronRight}<span>${escapeHtml(page.section)}</span>${icons.chevronRight}<span class="current">${escapeHtml(page.title)}</span></nav>` +
        `<div class="page-actions"><span class="badge">${readingMinutes(doc.html)} min read</span>` +
        `<button type="button" class="btn btn-outline btn-sm" data-action="copy-page">${icons.copy}<span>Copy page</span></button></div></div>` +
        `<article class="doc">${doc.html}</article>` +
        `<div class="pager">${card(previous, 'prev')}${card(next, 'next')}</div>` +
        `<div class="page-foot"><a class="btn btn-ghost btn-sm" href="${escapeHtml(nav.repo)}/blob/master/docs/${escapeHtml(path)}.md" target="_blank" rel="noopener noreferrer">${icons.external}<span>Edit this page on GitHub</span></a></div>`
      document.title = `${doc.title === '' ? page.title : doc.title} · ${nav.title}`
      enhance()
      buildToc(path, doc)
      content.focus({ preventScroll: true })
      scrollToAnchor(anchor)
    } catch (error) {
      if (token !== navigation) return
      content.innerHTML = `<div class="doc"><h1>Could not load this page</h1><div class="alert">${escapeHtml(error instanceof Error ? error.message : String(error))}</div></div>`
    }
  }
  content.addEventListener('click', (event) => {
    if (!(event.target instanceof Element)) return
    const copy = event.target.closest<HTMLButtonElement>('button.copy')
    if (copy !== null) {
      const code = copy.closest('figure')?.querySelector('pre code')?.textContent ?? ''
      void copyWithFeedback(copy, code, icons.copy, icons.check)
      return
    }
    const expand = event.target.closest<HTMLButtonElement>('button.expand')
    if (expand !== null) {
      expand.closest('figure')?.classList.remove('collapsed')
      expand.remove()
      return
    }
    const copyPage = event.target.closest<HTMLButtonElement>('[data-action="copy-page"]')
    if (copyPage !== null && currentPath !== undefined) void loadSource(currentPath).then((source) => copyWithFeedback(copyPage, source, `${icons.copy}<span>Copy page</span>`, `${icons.check}<span>Copied</span>`))
  })
  const step = (delta: number): void => {
    const index = pages.findIndex((page) => page.path === currentPath)
    const target = pages[index + delta]
    if (index >= 0 && target !== undefined) location.hash = `#/${target.path}`
  }
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeNav()
      setThemeMenu(false)
      return
    }
    const typing = isTyping(event.target)
    const searchKey = (event.key === '/' && !typing) || ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k')
    if (searchKey) {
      event.preventDefault()
      if (!searchDialog.open) palette.open()
      return
    }
    if (typing || event.ctrlKey || event.metaKey || event.altKey || searchDialog.open || shortcutsDialog.open) return
    if (event.key === '?') shortcutsDialog.showModal()
    else if (event.key === '[') step(-1)
    else if (event.key === ']') step(1)
  })
  let frame = 0
  const onScroll = (): void => {
    if (frame !== 0) return
    frame = requestAnimationFrame(() => {
      frame = 0
      const max = document.documentElement.scrollHeight - window.innerHeight
      progress.style.transform = `scaleX(${max > 0 ? Math.min(1, window.scrollY / max) : 0})`
      toTop.hidden = window.scrollY < 600
    })
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }))
  const route = (): void => {
    const { path, anchor } = parseHash()
    if (path === '') showLanding()
    else void show(path, anchor)
  }
  window.addEventListener('hashchange', route)
  route()
}

installStaticNavigation()

main().catch((error: unknown) => {
  const content = document.getElementById('content')
  if (content === null) return
  content.innerHTML = `<div class="doc"><h1>Documentation failed to load</h1><div class="alert">${escapeHtml(error instanceof Error ? error.message : String(error))}</div></div>`
})