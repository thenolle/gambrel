import { parsePattern, RouteConfigError, type RouteRecord } from '@gambrel/router'
import { CompilerError } from './errors.ts'

export interface RouteSource {
  readonly id: string
  readonly kind: 'page' | 'layout'
  readonly file: string
  readonly serverFile: string | undefined
}

export interface RouteTable {
  readonly routesDir: string
  readonly routes: readonly RouteRecord[]
  readonly sources: readonly RouteSource[]
}

interface DirFiles {
  page: string | undefined
  layout: string | undefined
  pageServer: string | undefined
  layoutServer: string | undefined
}

const GROUP = /^\([A-Za-z0-9_-]+\)$/
const ROUTE_FILE = /^(?:page|layout)(?:\.server)?\.[cm]?[jt]sx?$/
const SLOT: Readonly<Record<string, keyof DirFiles>> = {
  'page.tsx': 'page',
  'layout.tsx': 'layout',
  'page.server.ts': 'pageServer',
  'layout.server.ts': 'layoutServer'
}

export function compare(a: string, b: string): number {
  if (a < b) return -1
  return a > b ? 1 : 0
}

/**
 * Directories starting with `_` or `.` are excluded from route discovery, with their subtree.
 */
export function isIgnoredSegment(name: string): boolean {
  return name.startsWith('_') || name.startsWith('.')
}

function emptyDir(): DirFiles {
  return { page: undefined, layout: undefined, pageServer: undefined, layoutServer: undefined }
}

function splitDir(dir: string): string[] {
  return dir === '' ? [] : dir.split('/')
}

function shapeOf(pattern: string): string {
  return parsePattern(pattern).map((segment) => {
    if (segment.kind === 'static') return `=${segment.value}`
    return segment.kind === 'param' ? ':' : '*'
  }).join('/')
}

/**
 * Builds the route table from the files under the routes directory.
 *
 * `files` are paths relative to `routesDir`, using `/`. The function is pure: the same
 * set of files always produces the same table, whatever order they are given in. All
 * convention problems are collected and thrown together as one CompilerError.
 */
export function buildRouteTable(files: readonly string[], routesDir: string): RouteTable {
  const problems: string[] = []
  const dirs = new Map<string, DirFiles>()
  for (const file of [...files].sort(compare)) {
    const parts = file.split('/')
    const name = parts.pop() ?? ''
    if (parts.some(isIgnoredSegment) || !ROUTE_FILE.test(name)) continue
    const slot = SLOT[name]
    if (slot === undefined) {
      problems.push(`'${file}': unsupported route file; use 'page.tsx', 'layout.tsx', 'page.server.ts' or 'layout.server.ts'`)
      continue
    }
    const dir = parts.join('/')
    const entry = dirs.get(dir) ?? emptyDir()
    entry[slot] = file
    dirs.set(dir, entry)
  }
  const sortedDirs = [...dirs.keys()].sort(compare)
  const reportedGroups = new Set<string>()
  for (const dir of sortedDirs) {
    const segments = splitDir(dir)
    segments.forEach((segment, index) => {
      const path = segments.slice(0, index + 1).join('/')
      if ((segment.startsWith('(') || segment.endsWith(')')) && !GROUP.test(segment) && !reportedGroups.has(path)) {
        reportedGroups.add(path)
        problems.push(`'${path}': invalid group name; use letters, digits, '_' or '-' inside parentheses`)
      }
    })
    const files = dirs.get(dir) ?? emptyDir()
    if (files.pageServer !== undefined && files.page === undefined) problems.push(`'${files.pageServer}' needs a 'page.tsx' in the same directory`)
    if (files.layoutServer !== undefined && files.layout === undefined) problems.push(`'${files.layoutServer}' needs a 'layout.tsx' in the same directory`)
  }
  const routes: RouteRecord[] = []
  const sources: RouteSource[] = []
  const shapes = new Map<string, { readonly file: string; readonly pattern: string }>()
  for (const dir of sortedDirs) {
    const found = dirs.get(dir) ?? emptyDir()
    const segments = splitDir(dir)
    if (found.layout !== undefined) sources.push({ id: `layout:/${dir}`, kind: 'layout', file: found.layout, serverFile: found.layoutServer })
    if (found.page === undefined) continue
    const pattern = `/${segments.filter((segment) => !GROUP.test(segment)).join('/')}`
    let shape: string
    try {
      shape = shapeOf(pattern)
    } catch (error) {
      if (!(error instanceof RouteConfigError)) throw error
      problems.push(`'${found.page}': ${error.message}`)
      continue
    }
    const existing = shapes.get(shape)
    if (existing !== undefined) {
      problems.push(`'${existing.file}' and '${found.page}' resolve to the same URL ('${existing.pattern}' and '${pattern}')`)
      continue
    }
    shapes.set(shape, { file: found.page, pattern })
    const layouts: string[] = []
    for (let depth = 0; depth <= segments.length; depth += 1) {
      const ancestor = segments.slice(0, depth).join('/')
      if (dirs.get(ancestor)?.layout !== undefined) layouts.push(`layout:/${ancestor}`)
    }
    const id = `page:/${dir}`
    routes.push({ id, pattern, layouts })
    sources.push({ id, kind: 'page', file: found.page, serverFile: found.pageServer })
  }
  if (routes.length === 0 && problems.length === 0) problems.push(`No 'page.tsx' files found in '${routesDir}'`)
  if (problems.length > 0) throw new CompilerError(`Invalid routes in '${routesDir}':`, problems)
  routes.sort((a, b) => compare(a.id, b.id))
  sources.sort((a, b) => compare(a.id, b.id))
  return { routesDir, routes, sources }
}