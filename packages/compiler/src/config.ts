import { stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { CompilerError, isMissingFile } from './errors.ts'

export type BuildMode = 'development' | 'production'

export interface GambrelConfig {
  /**
   * Routes directory, relative to the project root. Default `src/routes`.
   */
  readonly routesDir?: string | undefined
  /**
   * Server entry point. Default `src/server.ts`.
   */
  readonly serverEntry?: string | undefined
  /**
   * Browser entry point. Default `src/client.ts`.
   */
  readonly clientEntry?: string | undefined
  /**
   * Build output directory. Default `dist`.
   */
  readonly outDir?: string | undefined
  /**
   * Emit external source maps. Default true.
   */
  readonly sourcemap?: boolean | undefined
  /**
   * Minify both bundles. Default true in production, false in development.
   */
  readonly minify?: boolean | undefined
}

export interface ResolvedConfig {
  readonly root: string
  readonly routesDir: string
  readonly generatedDir: string
  readonly serverEntry: string
  readonly clientEntry: string
  readonly outDir: string
  readonly target: 'bun'
  readonly mode: BuildMode
  readonly sourcemap: boolean
  readonly minify: boolean
}

const PATH_KEYS: readonly string[] = ['routesDir', 'serverEntry', 'clientEntry', 'outDir']
const FLAG_KEYS: readonly string[] = ['sourcemap', 'minify']

/**
 * Identity helper that gives `gambrel.config.ts` typed completion.
 */
export function defineConfig(config: GambrelConfig): GambrelConfig {
  return config
}

/**
 * Validates a configuration object. Unknown keys and wrong types are reported together.
 */
export function validateConfig(value: unknown, source = 'gambrel.config.ts'): GambrelConfig {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new CompilerError(`${source} must export a configuration object as its default export`)
  const record = value as Record<string, unknown>
  const problems: string[] = []
  for (const key of Object.keys(record)) {
    const entry = record[key]
    if (PATH_KEYS.includes(key)) {
      if (typeof entry !== 'string' || entry === '') problems.push(`'${key}' must be a non-empty string`)
    } else if (FLAG_KEYS.includes(key)) {
      if (typeof entry !== 'boolean') problems.push(`'${key}' must be a boolean`)
    } else {
      problems.push(`unknown option '${key}'`)
    }
  }
  if (problems.length > 0) throw new CompilerError(`Invalid ${source}:`, problems)
  return record as GambrelConfig
}

/**
 * Applies defaults and resolves every path against the project root.
 */
export function resolveConfig(root: string, config: GambrelConfig = {}, mode: BuildMode = 'production'): ResolvedConfig {
  const base = resolve(root)
  return {
    root: base,
    routesDir: resolve(base, config.routesDir ?? 'src/routes'),
    generatedDir: join(base, '.gambrel'),
    serverEntry: resolve(base, config.serverEntry ?? 'src/server.ts'),
    clientEntry: resolve(base, config.clientEntry ?? 'src/client.ts'),
    outDir: resolve(base, config.outDir ?? 'dist'),
    target: 'bun',
    mode,
    sourcemap: config.sourcemap ?? true,
    minify: config.minify ?? mode === 'production'
  }
}

/**
 * Loads `gambrel.config.ts` from the project root. Returns an empty configuration when
 * the file does not exist.
 */
export async function loadConfig(root: string): Promise<GambrelConfig> {
  const file = join(resolve(root), 'gambrel.config.ts')
  try {
    await stat(file)
  } catch (error) {
    if (isMissingFile(error)) return {}
    throw error
  }
  const loaded: unknown = await import(pathToFileURL(file).href)
  const exported = typeof loaded === 'object' && loaded !== null && 'default' in loaded ? loaded.default : undefined
  return validateConfig(exported, file)
}