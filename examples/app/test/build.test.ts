import { afterAll, describe, expect, test } from 'bun:test'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { buildApp, buildClient, CompilerError } from '@gambrel/compiler'

const root = join(import.meta.dir, '..')
const created: string[] = []

async function tempDir(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), 'gambrel-build-'))
  created.push(directory)
  return directory
}

afterAll(async () => {
  for (const directory of created) await rm(directory, { recursive: true, force: true })
})

describe('production build', () => {
  test('emits separate server and browser artifacts with manifests', async () => {
    const outDir = await tempDir()
    const result = await buildApp({ root, config: { outDir }, mode: 'production' })
    for (const file of [
      'client/client.js',
      'client/client.js.map',
      'server/index.js',
      'manifest/build.json',
      'manifest/routes.json'
    ]) {
      expect(result.outputs).toContain(file)
    }
    const build = JSON.parse(await readFile(join(outDir, 'manifest', 'build.json'), 'utf8')) as {
      version: number
      mode: string
      client: { entry: string }
      server: { entry: string }
    }
    expect(build.version).toBe(1)
    expect(build.mode).toBe('production')
    expect(build.client.entry).toBe('client/client.js')
    expect(build.server.entry).toBe('server/index.js')
    const routes = JSON.parse(await readFile(join(outDir, 'manifest', 'routes.json'), 'utf8')) as {
      routes: Array<{ id: string }>
    }
    expect(routes.routes.map((route) => route.id)).toContain('page:/users/[id]')
  }, 60_000)

  test('server-only code and data stay out of the browser bundle', async () => {
    const outDir = await tempDir()
    await buildApp({ root, config: { outDir }, mode: 'production' })
    const client = await readFile(join(outDir, 'client', 'client.js'), 'utf8')
    const server = await readFile(join(outDir, 'server', 'index.js'), 'utf8')
    expect(client).not.toContain('Ada Lovelace')
    expect(client).not.toContain('x-demo-user')
    expect(client).toContain('gambrel-data')
    expect(server).toContain('Ada Lovelace')
    const map = JSON.parse(await readFile(join(outDir, 'client', 'client.js.map'), 'utf8')) as { sources: string[] }
    const sources = map.sources.map((source) => source.replaceAll('\\', '/'))
    expect(sources.some((source) => source.includes('.server.'))).toBe(false)
    expect(sources.some((source) => /packages\/(ssr|bun|core|compiler)\//.test(source))).toBe(false)
    expect(sources.some((source) => source.includes('packages/browser/'))).toBe(true)
  }, 60_000)

  test('builds are deterministic', async () => {
    const first = await tempDir()
    const second = await tempDir()
    await buildApp({ root, config: { outDir: first }, mode: 'production' })
    await buildApp({ root, config: { outDir: second }, mode: 'production' })
    for (const file of ['client/client.js', 'server/index.js', 'manifest/build.json', 'manifest/routes.json']) expect(await readFile(join(first, file), 'utf8')).toBe(await readFile(join(second, file), 'utf8'))
  }, 60_000)

  test('a client graph that reaches a server module fails the build', async () => {
    const outDir = await tempDir()
    const attempt = buildClient({ root, config: { outDir, clientEntry: 'test/fixtures/leaky-client.ts' }, mode: 'production' })
    expect(attempt).rejects.toBeInstanceOf(CompilerError)
    expect(attempt).rejects.toThrow('Server-only module')
  }, 60_000)

  test('refuses an output directory that contains the project', async () => {
    expect(buildApp({ root, config: { outDir: '.' } })).rejects.toThrow('must not be the project root')
  })
})