import { describe, expect, test } from 'bun:test'
import { checkManifest, isSemver, rewriteDeclarationSpecifiers, rewriteManifest, sourceEntries, stageExports, topologicalOrder, type PackageManifest, type WorkspacePackage } from '../src/lib.ts'

function pkg(name: string, dependencies: Record<string, string> = {}): WorkspacePackage {
  const manifest: PackageManifest = {
    name,
    version: '1.2.3',
    description: `The ${name} package`,
    license: 'PolyForm-Strict-1.0.0',
    private: true,
    exports: { '.': { types: './src/index.ts', default: './src/index.ts' } },
    dependencies,
    scripts: { typecheck: 'tsc' }
  }
  return { dir: name.split('/')[1] ?? name, path: `/x/${name}`, manifest }
}

const names = new Set(['@gambrel/a', '@gambrel/b', '@gambrel/c'])

describe('ordering', () => {
  test('dependencies come first, ties by name', () => {
    const ordered = topologicalOrder([
      pkg('@gambrel/c', { '@gambrel/b': 'workspace:*' }),
      pkg('@gambrel/b', { '@gambrel/a': 'workspace:*' }),
      pkg('@gambrel/a')
    ])
    expect(ordered.map((item) => item.manifest.name)).toEqual(['@gambrel/a', '@gambrel/b', '@gambrel/c'])
  })

  test('a cycle is an error', () => {
    expect(() =>
      topologicalOrder([pkg('@gambrel/a', { '@gambrel/b': 'workspace:*' }), pkg('@gambrel/b', { '@gambrel/a': 'workspace:*' })])
    ).toThrow('cycle')
  })
})

describe('entries and exports', () => {
  test('TypeScript exports become bundles and other files become assets', () => {
    const { entries, assets } = sourceEntries({
      name: '@gambrel/x',
      version: '1.0.0',
      exports: {
        '.': { types: './src/index.ts', default: './src/index.ts' },
        './registry': { types: './src/registry.ts', default: './src/registry.ts' },
        './styles.css': './src/styles.css'
      }
    })
    expect(entries.map((entry) => entry.name)).toEqual(['index', 'registry'])
    expect(assets).toEqual([{ subpath: './styles.css', file: './src/styles.css', name: 'styles.css' }])
    expect(stageExports(entries, assets)).toEqual({
      '.': { types: './dist/index.d.ts', default: './dist/index.js' },
      './registry': { types: './dist/registry.d.ts', default: './dist/registry.js' },
      './styles.css': './dist/styles.css'
    })
  })

  test('two entries with the same file name are rejected', () => {
    expect(() =>
      sourceEntries({
        name: '@gambrel/x',
        version: '1.0.0',
        exports: { '.': './src/a/index.ts', './b': './src/b/index.ts' }
      })
    ).toThrow("named 'index'")
  })
})

describe('the published manifest', () => {
  test('uses real versions, built exports and no development fields', () => {
    const manifest = rewriteManifest(pkg('@gambrel/b', { '@gambrel/a': 'workspace:*' }).manifest, {
      version: '2.0.0',
      dir: 'b',
      publishNames: names
    })
    expect(manifest['version']).toBe('2.0.0')
    expect(manifest['dependencies']).toEqual({ '@gambrel/a': '^2.0.0' })
    expect(manifest['private']).toBeUndefined()
    expect(manifest['scripts']).toBeUndefined()
    expect(manifest['main']).toBe('./dist/index.js')
    expect(manifest['types']).toBe('./dist/index.d.ts')
    expect(manifest['files']).toEqual(['dist', 'README.md', 'LICENSE'])
    expect(manifest['publishConfig']).toEqual({ access: 'public' })
    expect(manifest['repository']).toEqual({
      type: 'git',
      url: 'git+https://github.com/thenolle/gambrel.git',
      directory: 'packages/b'
    })
  })

  test('a package with a stylesheet declares CSS as a side effect', () => {
    const manifest = rewriteManifest(
      {
        name: '@gambrel/a',
        version: '1.0.0',
        sideEffects: false,
        exports: { '.': './src/index.ts', './styles.css': './src/styles.css' }
      },
      { version: '1.0.0', dir: 'a', publishNames: names }
    )
    expect(manifest['sideEffects']).toEqual(['**/*.css'])
  })

  test('a dependency that is not published is an error', () => {
    expect(() =>
      rewriteManifest(pkg('@gambrel/a', { '@gambrel/website': 'workspace:*' }).manifest, {
        version: '1.0.0',
        dir: 'a',
        publishNames: names
      })
    ).toThrow('not published')
  })
})

describe('checks', () => {
  test('a complete manifest has no problems', () => {
    expect(checkManifest(pkg('@gambrel/a').manifest, names)).toEqual([])
  })

  test('reports every problem', () => {
    const problems = checkManifest({ name: 'other', version: 'x' }, names)
    expect(problems.length).toBe(5)
  })

  test('semver validation', () => {
    expect(isSemver('1.2.3')).toBe(true)
    expect(isSemver('1.2.3-alpha.1')).toBe(true)
    expect(isSemver('1.2')).toBe(false)
  })
})

describe('declaration files', () => {
  test('relative .ts and .tsx specifiers become .js', () => {
    const source = [
      "import { a } from './lib/a.ts'",
      "export * from '../b.tsx'",
      "type T = import('./c.ts').C",
      "import 'x/y.ts'",
      "import { v } from '@gambrel/view'"
    ].join('\n')
    expect(rewriteDeclarationSpecifiers(source)).toBe(
      [
        "import { a } from './lib/a.js'",
        "export * from '../b.js'",
        "type T = import('./c.js').C",
        "import 'x/y.ts'",
        "import { v } from '@gambrel/view'"
      ].join('\n')
    )
  })
})