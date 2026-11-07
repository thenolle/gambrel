export interface DocLocation {
  readonly path: string
  readonly anchor: string | undefined
}

function decode(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}

export function readDocLocation(): DocLocation {
  if (location.hash.startsWith('#/')) {
    const [path = '', anchor] = decode(location.hash.slice(2)).split('@')
    return { path, anchor: anchor === '' ? undefined : anchor }
  }
  if (document.body.dataset['docPage'] !== undefined) {
    return {
      path: document.body.dataset['docPage'] ?? '',
      anchor: location.hash === '' ? undefined : decode(location.hash.slice(1))
    }
  }
  const [path = '', anchor] = decode(location.hash.replace(/^#\/?/, '')).split('@')
  return { path, anchor: anchor === '' ? undefined : anchor }
}

function staticDestination(value: string): string | undefined {
  if (!value.startsWith('#/')) return undefined
  const [path = '', anchor] = decode(value.slice(2)).split('@')
  if (path !== '' && !/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/.test(path)) return undefined
  const url = new URL(path === '' ? './' : `${path}/`, document.baseURI)
  if (anchor !== undefined && anchor !== '') url.hash = anchor
  return url.href
}

export function installStaticNavigation(): void {
  document.documentElement.dataset['enhanced'] = 'true'
  if (document.body.dataset['docPage'] === undefined) return
  const upgrade = (root: ParentNode): void => {
    root.querySelectorAll<HTMLAnchorElement>('a[href]').forEach((link) => {
      const href = link.getAttribute('href') ?? ''
      const destination = staticDestination(href)
      if (destination !== undefined) link.href = destination
      else if (href.startsWith('#') && !href.startsWith('#/')) link.href = `${location.pathname}${location.search}${href}`
    })
  }
  upgrade(document)
  const observer = new MutationObserver(() => upgrade(document))
  observer.observe(document.body, { childList: true, subtree: true })
  const redirectLegacy = (): void => {
    const destination = staticDestination(location.hash)
    if (destination !== undefined) location.replace(destination)
  }
  window.addEventListener('hashchange', (event) => {
    if (!location.hash.startsWith('#/')) return
    event.stopImmediatePropagation()
    redirectLegacy()
  })
  window.addEventListener('pagehide', () => observer.disconnect(), { once: true })
  redirectLegacy()
}