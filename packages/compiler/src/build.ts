import type { BunPlugin } from 'bun'
import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { basename, dirname, isAbsolute, join, relative, sep } from 'node:path'
import { resolveConfig, type BuildMode, type GambrelConfig, type ResolvedConfig } from './config.ts'
import { CompilerError, isMissingFile } from './errors.ts'
import { generateRoutes } from './generate.ts'
import type { RouteTable } from './table.ts'

export interface BuildOptions {
  readonly root: string
  readonly config?: GambrelConfig | undefined
  readonly mode?: BuildMode | undefined
}

export interface BuildResult {
  readonly config: ResolvedConfig
  readonly table: RouteTable
  /**
   * Every file in the output directory, relative to it, with `/` separators, sorted.
   */
  readonly outputs: readonly string[]
}

const FORBIDDEN_FILE = /\.server(?:\.[cm]?[jt]sx?)?$/
const FORBIDDEN_MODULE = /^(?:@gambrel\/(?:ssr|bun|core|compiler)(?:\/.*)?|bun:.*|node:.*)$/

function clientGuard(): BunPlugin {
  return {
    name: 'gambrel-client-guard',
    setup(build) {
      build.onResolve({ filter: /.*/ }, (args) => {
        if (FORBIDDEN_FILE.test(args.path) || FORBIDDEN_MODULE.test(args.path)) throw new Error(`Server-only module '${args.path}' is imported by '${args.importer}' and would ship to the browser. Only page.tsx and layout.tsx may be reachable from the client entry; keep server code in *.server.ts files.`)
        return undefined
      })
    }
  }
}

function messagesOf(error: unknown): string[] {
  if (error instanceof AggregateError) return error.errors.map((item) => (item instanceof Error ? item.message : String(item)))
  return [error instanceof Error ? error.message : String(error)]
}

async function runBuild(options: Bun.BuildConfig, label: string): Promise<void> {
  let result: Bun.BuildOutput
  try {
    result = await Bun.build(options)
  } catch (error) {
    throw new CompilerError(`The ${label} build failed:`, messagesOf(error))
  }
  if (!result.success) throw new CompilerError(`The ${label} build failed:`, result.logs.map((log) => log.message))
}

async function assertFile(path: string, name: string): Promise<void> {
  try {
    if ((await stat(path)).isFile()) return
  } catch (error) {
    if (!isMissingFile(error)) throw error
  }
  throw new CompilerError(`${name} not found: '${path}'. Create it or set '${name}' in gambrel.config.ts.`)
}

function assertSafeOutDir(config: ResolvedConfig): void {
  const fromOutToRoot = relative(config.outDir, config.root)
  if (fromOutToRoot === '' || (!fromOutToRoot.startsWith('..') && !isAbsolute(fromOutToRoot))) throw new CompilerError(`outDir '${config.outDir}' must not be the project root or contain it`)
}

async function listFiles(directory: string, base: string): Promise<string[]> {
  const files: string[] = []
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (isMissingFile(error)) return files
    throw error
  }
  for (const entry of entries) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(path, base)))
    else if (entry.isFile()) files.push(relative(base, path).split(sep).join('/'))
  }
  return files.sort()
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function clientFileName(config: ResolvedConfig): string {
  return `${basename(config.clientEntry).replace(/\.[^.]+$/, '')}.js`
}

async function bundleClient(config: ResolvedConfig): Promise<void> {
  await runBuild({
    entrypoints: [config.clientEntry],
    outdir: join(config.outDir, 'client'),
    target: 'browser',
    format: 'esm',
    naming: '[name].[ext]',
    minify: config.minify,
    sourcemap: config.sourcemap ? 'external' : 'none',
    define: { 'process.env.NODE_ENV': JSON.stringify(config.mode) },
    plugins: [clientGuard()]
  }, 'browser')
}

async function bundleServer(config: ResolvedConfig): Promise<void> {
  await runBuild({
    entrypoints: [config.serverEntry],
    outdir: join(config.outDir, 'server'),
    target: config.target,
    format: 'esm',
    naming: { entry: 'index.js' },
    minify: config.minify,
    sourcemap: config.sourcemap ? 'external' : 'none',
    define: { 'process.env.NODE_ENV': JSON.stringify(config.mode) }
  }, 'server')
}

async function prepare(options: BuildOptions): Promise<{ config: ResolvedConfig; table: RouteTable }> {
  const config = resolveConfig(options.root, options.config, options.mode)
  assertSafeOutDir(config)
  await assertFile(config.clientEntry, 'clientEntry')
  const { table } = await generateRoutes({
    root: config.root,
    routesDir: config.routesDir,
    outDir: config.generatedDir
  })
  return { config, table }
}

/**
 * Regenerates the route manifests and rebuilds only the browser bundle into
 * `<outDir>/client`. Used by the development workflow.
 */
export async function buildClient(options: BuildOptions): Promise<BuildResult> {
  const { config, table } = await prepare(options)
  await rm(join(config.outDir, 'client'), { recursive: true, force: true })
  await bundleClient(config)
  return { config, table, outputs: await listFiles(join(config.outDir, 'client'), config.outDir) }
}

/**
 * Full production-style build: regenerates the manifests, empties the output directory,
 * builds the browser and server bundles from separate entry graphs and writes
 * `manifest/build.json` and `manifest/routes.json`.
 */
export async function buildApp(options: BuildOptions): Promise<BuildResult> {
  const { config, table } = await prepare(options)
  await assertFile(config.serverEntry, 'serverEntry')
  await rm(config.outDir, { recursive: true, force: true })
  await bundleClient(config)
  await bundleServer(config)
  const clientEntry = `client/${clientFileName(config)}`
  const serverEntry = 'server/index.js'
  for (const entry of [clientEntry, serverEntry]) await assertFile(join(config.outDir, entry), entry)
  await writeJson(join(config.outDir, 'manifest', 'routes.json'), { version: 1, routes: table.routes })
  await writeJson(join(config.outDir, 'manifest', 'build.json'), {
    version: 1,
    mode: config.mode,
    target: config.target,
    client: { entry: clientEntry, files: await listFiles(join(config.outDir, 'client'), config.outDir) },
    server: { entry: serverEntry, files: await listFiles(join(config.outDir, 'server'), config.outDir) }
  })
  return { config, table, outputs: await listFiles(config.outDir, config.outDir) }
}