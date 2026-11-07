import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { escapeHtml } from '../src/escape.ts'
import { renderLanding } from '../src/landing.ts'
import { renderMarkdown } from '../src/markdown.ts'
import { flatten, parseNav } from '../src/nav.ts'
import { DEFAULT_SITE_URL, descriptionFromHtml, normalizeSiteUrl, pageFile, pageUrl, rootRelativeBase, seoHead, staticLinks, type PageSeo } from '../src/seo.ts'
import { socialImage } from './social-image.ts'

function replaceMain(shell: string, content: string): string {
  const pattern = /(<main\b(?=[^>]*\bid="content")[^>]*>)[\s\S]*?<\/main>/i
  if (!pattern.test(shell)) throw new Error('Documentation shell has no #content main')
  return shell.replace(pattern, (_match, opening: string) => `${opening}${content}</main>`)
}

function replaceNav(shell: string, content: string): string {
  return shell.replace(/(<nav\b(?=[^>]*\bid="sidebar")[^>]*>)[\s\S]*?<\/nav>/i, (_match, opening: string) => `${opening}${content}</nav>`)
}

function addHead(shell: string, page: PageSeo, site: URL): string {
  return shell.replace(/<title>[\s\S]*?<\/title>/i, '').replace(/<head>/i, `<head>\n<base href="${rootRelativeBase(page.path)}">`).replace('</head>', `${seoHead(page, site)}\n</head>`)
}

export async function prerender(dist: string, docs: string, siteValue: string): Promise<void> {
  const site = normalizeSiteUrl(siteValue)
  const nav = parseNav(JSON.parse(await readFile(join(docs, 'nav.json'), 'utf8')))
  const pages = flatten(nav)
  const shell = await readFile(join(dist, 'index.html'), 'utf8')
  const iconShell = await readFile(join(dist, 'icons.html'), 'utf8')
  const urls: string[] = []
  const sidebar = nav.sections.map((section) =>
    `<section class="nav-section"><h2>${escapeHtml(section.title)}</h2><ul>` +
    section.pages.map((page) => `<li><a href="${escapeHtml(page.path)}/">${escapeHtml(page.title)}</a></li>`).join('') +
    '</ul></section>'
  ).join('')
  const output = async (path: string, title: string, description: string, content: string, sourceShell: string, noindex = false): Promise<void> => {
    const imageName = path === '' ? 'home' : path.replace(/[^a-z0-9-]/g, '-')
    const image = `social/${imageName}.png`
    await mkdir(join(dist, 'social'), { recursive: true })
    await writeFile(join(dist, image), socialImage(title))
    const metadata: PageSeo = {
      path,
      title: `${title} · Gambrel`,
      description,
      image,
      noindex
    }
    let html = path === 'icons.html' ? sourceShell : replaceMain(replaceNav(sourceShell, sidebar), content)
    if (path !== 'icons.html') {
      html = html.replace(/<body\b([^>]*)>/i, (_match, attributes: string) => `<body${attributes} data-doc-page="${escapeHtml(path)}">`)
      if (path === '') html = html.replace('data-view="doc"', 'data-view="landing"')
    }
    html = staticLinks(addHead(html, metadata, site))
    const target = join(dist, pageFile(path))
    await mkdir(dirname(target), { recursive: true })
    await writeFile(target, html, 'utf8')
    if (!noindex) urls.push(pageUrl(path, site))
  }
  await output(
    '',
    'Documentation',
    'Build TypeScript and JSX applications with Gambrel: routing, server rendering, hydration, components and SVG icons.',
    renderLanding(nav),
    shell
  )
  const imageNames = new Set(['home', 'icons-html', '404-html'])
  for (const page of pages) {
    const imageName = page.path.replace(/[^a-z0-9-]/g, '-')
    if (imageNames.has(imageName)) throw new Error(`Social image path collision: ${page.path}`)
    imageNames.add(imageName)
    const source = await readFile(join(docs, `${page.path}.md`), 'utf8')
    const rendered = renderMarkdown(source, { docPath: page.path })
    const description = page.summary ?? descriptionFromHtml(rendered.html)
    const index = pages.indexOf(page)
    const previous = pages[index - 1]
    const next = pages[index + 1]
    const pager = '<nav class="pager" aria-label="Documentation pages">' +
      (previous === undefined ? '' : `<a class="pager-card prev" href="${previous.path}/"><span class="pager-label">Previous</span>${escapeHtml(previous.title)}</a>`) +
      (next === undefined ? '' : `<a class="pager-card next" href="${next.path}/"><span class="pager-label">Next</span>${escapeHtml(next.title)}</a>`) +
      '</nav>'
    await output(
      page.path,
      rendered.title || page.title,
      description || `Documentation for ${page.title} in Gambrel.`,
      `<article class="doc">${rendered.html}</article>${pager}`,
      shell
    )
  }
  await output(
    'icons.html',
    'Icon catalog',
    'Browse Gambrel SVG icons, filter by category, customize previews and copy imports, JSX or SVG.',
    '',
    iconShell
  )
  await output(
    '404.html',
    'Page not found',
    'The requested Gambrel documentation page could not be found.',
    '<article class="doc"><h1>Page not found</h1><p><a href="./">Return to the documentation</a></p></article>',
    shell,
    true
  )
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map((url) => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n') +
    '\n</urlset>\n'
  await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8')
  await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${new URL('sitemap.xml', site).href}\n`, 'utf8')
}

export const defaultSiteUrl = DEFAULT_SITE_URL