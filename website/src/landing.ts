import { escapeHtml } from './escape.ts'
import { icons } from './icons.ts'
import { renderMarkdown } from './markdown.ts'
import type { Nav } from './nav.ts'

export const TAGLINE =
  'A small TypeScript-first, JSX-based full-stack framework for Bun: file routes, typed loaders, server rendering and hydration.'

/**
 * Builds the landing page from the navigation. Every title and summary is escaped.
 */
export function renderLanding(nav: Nav): string {
  const paths = new Set(nav.sections.flatMap((section) => section.pages.map((page) => page.path)))
  const first = nav.sections[0]?.pages[0]?.path
  const start = paths.has('getting-started') ? 'getting-started' : first
  const primary =
    start === undefined
      ? ''
      : `<a class="btn btn-primary" href="#/${escapeHtml(start)}">Get started${icons.arrowRight}</a>`
  const secondary = paths.has('cheatsheet') ? '<a class="btn btn-outline" href="#/cheatsheet">Cheat sheet</a>' : ''
  const folder = nav.repo.split('/').pop() || 'gambrel'
  const install = renderMarkdown(
    ['```bash', `git clone ${nav.repo}.git`, `cd ${folder} && bun install`, 'bun run build && bun run start', '```'].join('\n'),
    { docPath: '' }
  ).html

  const cards = nav.sections
    .map((section) => {
      const count = section.pages.length
      const links = section.pages
        .map(
          (page) =>
            `<li><a href="#/${escapeHtml(page.path)}"><span class="card-title">${escapeHtml(page.title)}</span>` +
            (page.summary === undefined ? '' : `<span class="card-sub">${escapeHtml(page.summary)}</span>`) +
            '</a></li>'
        )
        .join('')
      return (
        `<article class="card"><header><h2>${escapeHtml(section.title)}</h2>` +
        `<span class="badge">${count} ${count === 1 ? 'page' : 'pages'}</span></header><ul>${links}</ul></article>`
      )
    })
    .join('')

  return (
    '<div class="landing">' +
    '<section class="hero">' +
    '<span class="badge">Prototype · Bun only</span>' +
    `<h1>${escapeHtml(nav.title)}</h1>` +
    `<p class="lead">${escapeHtml(TAGLINE)}</p>` +
    `<div class="actions">${primary}${secondary}` +
    `<a class="btn btn-ghost" href="${escapeHtml(nav.repo)}" target="_blank" rel="noopener noreferrer">GitHub${icons.external}</a></div>` +
    `<div class="install">${install}</div>` +
    '</section>' +
    `<section class="cards">${cards}</section>` +
    '</div>'
  )
}