import { describe, expect, test } from 'bun:test'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { CompilerError, discoverRoutes, generateRoutes } from '../src/index.ts'

async function createProject(files: readonly string[]): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), 'gambrel-'))
  for (const file of files) {
    const path = join(root, 'src', 'routes', file)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, 'export default () => null\n')
  }
  return root
}

describe('discovery on disk', () => {
  test('discovers routes and skips ignored directories', async () => {
    const root = await createProject([
      'layout.tsx',
      'page.tsx',
      'users/[id]/page.tsx',
      '_private/page.tsx',
      '.cache/page.tsx'
    ])
    try {
      const table = await discoverRoutes(join(root, 'src', 'routes'))
      expect(table.routes.map((route) => route.id)).toEqual(['page:/', 'page:/users/[id]'])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test('reports a missing routes directory', async () => {
    const root = await mkdtemp(join(tmpdir(), 'gambrel-'))
    try {
      expect(generateRoutes({ root })).rejects.toThrow('Routes directory not found')
      expect(generateRoutes({ root })).rejects.toBeInstanceOf(CompilerError)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})

describe('generateRoutes', () => {
  test('writes the manifests, then writes nothing when nothing changed', async () => {
    const root = await createProject(['layout.tsx', 'page.tsx', 'about/page.tsx'])
    try {
      const first = await generateRoutes({ root })
      expect(first.written).toEqual(['manifest.client.ts', 'manifest.server.ts', 'routes.ts'])
      const client = await readFile(join(first.outDir, 'manifest.client.ts'), 'utf8')
      expect(client).toContain("import page_2 from '../src/routes/about/page.tsx'")
      const second = await generateRoutes({ root })
      expect(second.written).toEqual([])
      await mkdir(join(root, 'src', 'routes', 'blog'), { recursive: true })
      await writeFile(join(root, 'src', 'routes', 'blog', 'page.tsx'), 'export default () => null\n')
      const third = await generateRoutes({ root })
      expect(third.written).toEqual(['manifest.client.ts', 'manifest.server.ts', 'routes.ts'])
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test('surfaces convention errors with file names', async () => {
    const root = await createProject(['page.tsx', 'about/page.ts'])
    try {
      expect(generateRoutes({ root })).rejects.toThrow("'about/page.ts'")
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})