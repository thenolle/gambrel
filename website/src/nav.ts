export interface NavPage {
  readonly title: string
  readonly path: string
  readonly summary: string | undefined
}

export interface NavSection {
  readonly title: string
  readonly pages: readonly NavPage[]
}

export interface Nav {
  readonly title: string
  readonly repo: string
  readonly sections: readonly NavSection[]
}

export interface FlatPage extends NavPage {
  readonly section: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validates `docs/nav.json`. Throws with the expected shape when it is wrong.
 */
export function parseNav(value: unknown): Nav {
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

/**
 * Every page in reading order, each tagged with its section title.
 */
export function flatten(nav: Nav): FlatPage[] {
  return nav.sections.flatMap((section) => section.pages.map((page) => ({ ...page, section: section.title })))
}