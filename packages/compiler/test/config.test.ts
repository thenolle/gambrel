import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { CompilerError, defineConfig, loadConfig, resolveConfig, validateConfig } from '../src/index.ts'

describe('configuration', () => {
  test('applies defaults and resolves paths against the root', () => {
    const config = resolveConfig('/app')
    expect(config.routesDir).toBe(resolve('/app', 'src/routes'))
    expect(config.serverEntry).toBe(resolve('/app', 'src/server.ts'))
    expect(config.clientEntry).toBe(resolve('/app', 'src/client.ts'))
    expect(config.outDir).toBe(resolve('/app', 'dist'))
    expect(config.generatedDir).toBe(resolve('/app', '.gambrel'))
    expect(config.target).toBe('bun')
    expect(config.sourcemap).toBe(true)
    expect(config.minify).toBe(true)
  })

  test('minification follows the mode unless configured', () => {
    expect(resolveConfig('/app', {}, 'development').minify).toBe(false)
    expect(resolveConfig('/app', { minify: false }, 'production').minify).toBe(false)
    expect(resolveConfig('/app', { outDir: 'out', sourcemap: false }).outDir).toBe(resolve('/app', 'out'))
  })

  test('defineConfig returns its input', () => {
    const config = { outDir: 'out' }
    expect(defineConfig(config)).toBe(config)
  })

  test('validation reports unknown options and wrong types together', () => {
    let error: unknown
    try {
      validateConfig({ outdir: 'x', minify: 'yes', clientEntry: '' })
    } catch (caught) {
      error = caught
    }
    expect(error).toBeInstanceOf(CompilerError)
    expect((error as CompilerError).problems.length).toBe(3)
    expect(() => validateConfig(null)).toThrow('configuration object')
  })

  test('loadConfig reads the default export and tolerates a missing file', async () => {
    const root = await mkdtemp(join(tmpdir(), 'gambrel-config-'))
    try {
      expect(await loadConfig(root)).toEqual({})
      await writeFile(join(root, 'gambrel.config.ts'), "export default { outDir: 'out' }\n")
      expect(await loadConfig(root)).toEqual({ outDir: 'out' })
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})