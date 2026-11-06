import { describe, expect, test } from 'bun:test'
import { join } from 'node:path'
import { buildRouteTable, generateModules } from '../src/index.ts'

const routesDir = join('/app', 'src', 'routes')
const outDir = join('/app', '.gambrel')
const table = buildRouteTable(
  ['layout.tsx', 'page.tsx', 'users/[id]/page.tsx', 'users/[id]/page.server.ts'],
  routesDir
)

describe('generated modules', () => {
  test('routes.ts lists the route records', () => {
    const { 'routes.ts': routes } = generateModules(table, outDir)
    expect(routes).toContain("{ id: 'page:/', pattern: '/', layouts: ['layout:/'] }")
    expect(routes).toContain(
      "{ id: 'page:/users/[id]', pattern: '/users/[id]', layouts: ['layout:/'] }"
    )
  })

  test('the client manifest imports components only', () => {
    const { 'manifest.client.ts': client } = generateModules(table, outDir)
    expect(client).toContain("import layout_0 from '../src/routes/layout.tsx'")
    expect(client).toContain("import page_2 from '../src/routes/users/[id]/page.tsx'")
    expect(client).toContain("['page:/users/[id]', page_2]")
    expect(client).not.toContain('.server')
    expect(client).not.toContain('hooksFromModule')
  })

  test('the server manifest also imports the server hooks', () => {
    const { 'manifest.server.ts': server } = generateModules(table, outDir)
    expect(server).toContain("import * as hooks_2 from '../src/routes/users/[id]/page.server.ts'")
    expect(server).toContain("['page:/users/[id]', hooksFromModule('page:/users/[id]', hooks_2)]")
  })

  test('the server manifest has an empty hook map when there are no server files', () => {
    const plain = buildRouteTable(['page.tsx'], routesDir)
    const { 'manifest.server.ts': server } = generateModules(plain, outDir)
    expect(server).toContain('new Map<string, EntryHooks<never>>()')
  })

  test('output is deterministic', () => {
    expect(generateModules(table, outDir)).toEqual(generateModules(table, outDir))
  })

  test('quotes route ids safely', () => {
    const odd = buildRouteTable(["it's/page.tsx"], routesDir)
    expect(generateModules(odd, outDir)['routes.ts']).toContain("'page:/it\\'s'")
  })
})