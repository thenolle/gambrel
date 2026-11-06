import { describe, expect, test } from 'bun:test'
import { buildRouteTable, CompilerError } from '../src/index.ts'

const ROUTES_DIR = '/app/src/routes'

const files = [
  'layout.tsx',
  'page.tsx',
  'about/page.tsx',
  'about/Helper.tsx',
  'users/layout.tsx',
  'users/[id]/page.tsx',
  'users/[id]/page.server.ts',
  '(marketing)/layout.tsx',
  '(marketing)/pricing/page.tsx',
  'docs/[...slug]/page.tsx',
  '_components/Button.tsx',
  '_private/page.tsx'
]

function problemsOf(input: readonly string[]): readonly string[] {
  try {
    buildRouteTable(input, ROUTES_DIR)
  } catch (error) {
    if (error instanceof CompilerError) return error.problems
    throw error
  }
  throw new Error('Expected a CompilerError')
}

describe('route discovery', () => {
  test('builds the expected route table', () => {
    const table = buildRouteTable(files, ROUTES_DIR)
    expect(table.routes).toEqual([
      { id: 'page:/', pattern: '/', layouts: ['layout:/'] },
      { id: 'page:/(marketing)/pricing', pattern: '/pricing', layouts: ['layout:/', 'layout:/(marketing)'] },
      { id: 'page:/about', pattern: '/about', layouts: ['layout:/'] },
      { id: 'page:/docs/[...slug]', pattern: '/docs/[...slug]', layouts: ['layout:/'] },
      { id: 'page:/users/[id]', pattern: '/users/[id]', layouts: ['layout:/', 'layout:/users'] }
    ])
    expect(table.sources.map((source) => source.id)).toEqual([
      'layout:/',
      'layout:/(marketing)',
      'layout:/users',
      'page:/',
      'page:/(marketing)/pricing',
      'page:/about',
      'page:/docs/[...slug]',
      'page:/users/[id]'
    ])
    const user = table.sources.find((source) => source.id === 'page:/users/[id]')
    expect(user?.file).toBe('users/[id]/page.tsx')
    expect(user?.serverFile).toBe('users/[id]/page.server.ts')
  })

  test('is independent of the order files are listed in', () => {
    const forward = buildRouteTable(files, ROUTES_DIR)
    expect(buildRouteTable([...files].reverse(), ROUTES_DIR)).toEqual(forward)
    const shuffled = [...files].sort((a, b) => (a.length % 3) - (b.length % 3) || a.localeCompare(b))
    expect(buildRouteTable(shuffled, ROUTES_DIR)).toEqual(forward)
  })

  test('ignores underscore folders and colocated files', () => {
    const table = buildRouteTable(files, ROUTES_DIR)
    const ids = table.sources.map((source) => source.id)
    expect(ids.some((id) => id.includes('_private') || id.includes('Helper'))).toBe(false)
  })
})

describe('convention errors', () => {
  test('rejects unsupported route file names', () => {
    expect(problemsOf(['page.tsx', 'about/page.ts'])[0]).toContain("'about/page.ts'")
    expect(problemsOf(['page.tsx', 'about/page.server.tsx'])[0]).toContain('unsupported route file')
  })

  test('rejects server files without a component', () => {
    expect(problemsOf(['page.tsx', 'about/page.server.ts'])[0]).toContain("needs a 'page.tsx'")
    expect(problemsOf(['page.tsx', 'layout.server.ts'])[0]).toContain("needs a 'layout.tsx'")
  })

  test('rejects pages that resolve to the same URL', () => {
    const groups = problemsOf(['(a)/x/page.tsx', '(b)/x/page.tsx'])[0] ?? ''
    expect(groups).toContain('resolve to the same URL')
    expect(groups).toContain('(a)/x/page.tsx')
    expect(groups).toContain('(b)/x/page.tsx')
    expect(problemsOf(['u/[id]/page.tsx', 'u/[name]/page.tsx'])[0]).toContain('resolve to the same URL')
  })

  test('rejects invalid patterns and group names', () => {
    expect(problemsOf(['docs/[...slug]/page.tsx', 'docs/[...slug]/edit/page.tsx'])[0]).toContain('last segment')
    expect(problemsOf(['(bad name)/page.tsx'])[0]).toContain('invalid group name')
  })

  test('rejects a routes directory without pages', () => {
    expect(problemsOf(['layout.tsx'])[0]).toContain("No 'page.tsx' files found")
  })

  test('reports every problem together', () => {
    expect(problemsOf(['page.tsx', 'a/page.ts', 'b/page.server.ts']).length).toBe(2)
  })
})