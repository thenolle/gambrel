import { escapeHtml } from './escape.ts'

export const DEFAULT_SITE_URL = 'https://thenolle.github.io/gambrel/'

export interface PageSeo {
  readonly path: string
  readonly title: string
  readonly description: string
  readonly image: string
  readonly noindex?: boolean | undefined
}

export function normalizeSiteUrl(value: string): URL {
  const url = new URL(value)
  if (!['http:', 'https:'].includes(url.protocol)) throw new TypeError('DOCS_SITE_URL must use HTTP or HTTPS')
  if (url.username !== '' || url.password !== '' || url.search !== '' || url.hash !== '') throw new TypeError('DOCS_SITE_URL must not contain credentials, a query or a fragment')
  if (!url.pathname.endsWith('/')) url.pathname += '/'
  return url
}

export function validateDocPath(path: string): void {
  if (!/^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*$/.test(path)) throw new TypeError(`Invalid static documentation path '${path}'`)
}

export function pageFile(path: string): string {
  if (path === '') return 'index.html'
  if (path === 'icons.html' || path === '404.html') return path
  validateDocPath(path)
  return `${path}/index.html`
}

export function pageUrl(path: string, site: URL): string {
  if (path === '') return site.href
  if (path === 'icons.html' || path === '404.html') return new URL(path, site).href
  validateDocPath(path)
  return new URL(`${path}/`, site).href
}

export function rootRelativeBase(path: string): string {
  if (path === '' || path.endsWith('.html')) return './'
  return '../'.repeat(path.split('/').length)
}

export function descriptionFromHtml(html: string): string {
  const paragraph = /<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/i.exec(html)?.[1] ?? ''
  return paragraph.replace(/<[^>]*>/g, ' ').replace(/&(?:amp|lt|gt|quot|#39);/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 170)
}

/**
 * Converts the existing renderer's hash routes to static page URLs.
 * The output remains relative to the HTML base URL.
 */
export function staticLinks(html: string): string {
  return html.replace(/href="#\/([^"@]*)(?:@([^"]*))?"/g, (_match, path: string, anchor?: string) => {
    if (path !== '') validateDocPath(path)
    const destination = path === '' ? './' : `${path}/`
    return `href="${destination}${anchor === undefined || anchor === '' ? '' : `#${anchor}`}"`
  })
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/g, (character) => `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`)
}

export function seoHead(page: PageSeo, site: URL): string {
  const canonical = pageUrl(page.path, site)
  const image = new URL(page.image, site).href
  const title = page.title
  const description = page.description
  const meta = (name: string, value: string, property = false): string => `<meta ${property ? 'property' : 'name'}="${name}" content="${escapeHtml(value)}">`
  const structured = {
    '@context': 'https://schema.org',
    '@type': page.path === '' ? 'WebSite' : 'WebPage',
    '@id': canonical,
    url: canonical,
    name: title,
    description,
    inLanguage: 'en',
    primaryImageOfPage: {
      '@type': 'ImageObject',
      url: image,
      width: 1200,
      height: 630
    },
    ...(page.path === '' ? {} : {
      isPartOf: {
        '@type': 'WebSite',
        '@id': site.href,
        url: site.href,
        name: 'Gambrel documentation'
      }
    })
  }
  return [
    `<title>${escapeHtml(title)}</title>`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    meta('description', description),
    meta('robots', page.noindex === true ? 'noindex, follow' : 'index, follow, max-image-preview:large'),
    meta('og:type', 'website', true),
    meta('og:site_name', 'Gambrel', true),
    meta('og:locale', 'en_US', true),
    meta('og:title', title, true),
    meta('og:description', description, true),
    meta('og:url', canonical, true),
    meta('og:image', image, true),
    meta('og:image:type', 'image/png', true),
    meta('og:image:width', '1200', true),
    meta('og:image:height', '630', true),
    meta('og:image:alt', `Gambrel documentation: ${title}`, true),
    meta('twitter:card', 'summary_large_image'),
    meta('twitter:title', title),
    meta('twitter:description', description),
    meta('twitter:image', image),
    meta('twitter:image:alt', `Gambrel documentation: ${title}`),
    `<script type="application/ld+json">${safeJson(structured)}</script>`
  ].join('\n')
}