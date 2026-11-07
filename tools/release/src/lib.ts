import { REPOSITORY } from './packages.ts'

export interface PackageManifest {
  readonly name: string
  readonly version: string
  readonly description?: string
  readonly license?: string
  readonly private?: boolean
  readonly sideEffects?: boolean | readonly string[]
  readonly exports?: Readonly<Record<string, unknown>>
  readonly dependencies?: Readonly<Record<string, string>>
  readonly [key: string]: unknown
}

export interface WorkspacePackage {
  readonly dir: string
  readonly path: string
  readonly manifest: PackageManifest
}

export interface ExportEntry {
  readonly subpath: string
  readonly source: string
  readonly name: string
}

export interface AssetEntry {
  readonly subpath: string
  readonly file: string
  readonly name: string
}

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const SPECIFIER = /((?:\bfrom|\bimport\s*\(?)\s*['"])(\.{1,2}\/[^'"]*?)\.tsx?(['"])/g

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compare(a: string, b: string): number {
  if (a < b) return -1
  return a > b ? 1 : 0
}

export function isSemver(value: string): boolean {
  return SEMVER.test(value)
}

/**
 * Orders packages so that every package comes after the workspace packages it depends on.
 * Ties are broken by name, so the order is stable. A dependency cycle throws.
 */
export function topologicalOrder(packages: readonly WorkspacePackage[]): WorkspacePackage[] {
  const byName = new Map(packages.map((pkg) => [pkg.manifest.name, pkg]))
  const ordered: WorkspacePackage[] = []
  const state = new Map<string, 'visiting' | 'done'>()
  const visit = (pkg: WorkspacePackage, trail: readonly string[]): void => {
    const name = pkg.manifest.name
    if (state.get(name) === 'done') return
    if (state.get(name) === 'visiting') throw new Error(`Dependency cycle: ${[...trail, name].join(' -> ')}`)
    state.set(name, 'visiting')
    for (const dependency of Object.keys(pkg.manifest.dependencies ?? {}).sort(compare)) {
      const next = byName.get(dependency)
      if (next !== undefined) visit(next, [...trail, name])
    }
    state.set(name, 'done')
    ordered.push(pkg)
  }
  for (const pkg of [...packages].sort((a, b) => compare(a.manifest.name, b.manifest.name))) visit(pkg, [])
  return ordered
}

function baseName(file: string, keepExtension = false): string {
  const last = file.split('/').pop() ?? file
  return keepExtension ? last : last.replace(/\.[^.]+$/, '')
}

/**
 * Splits a package's `exports` into TypeScript entry points (bundled) and other files such
 * as stylesheets (copied). Two entries with the same file name are an error.
 */
export function sourceEntries(manifest: PackageManifest): { entries: ExportEntry[]; assets: AssetEntry[] } {
  const entries: ExportEntry[] = []
  const assets: AssetEntry[] = []
  for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
    const file = typeof target === 'string' ? target : isRecord(target) && typeof target['default'] === 'string' ? target['default'] : undefined
    if (file === undefined) throw new Error(`${manifest.name}: export '${subpath}' has no default file`)
    if (/\.tsx?$/.test(file)) entries.push({ subpath, source: file, name: baseName(file) })
    else assets.push({ subpath, file, name: baseName(file, true) })
  }
  const seen = new Set<string>()
  for (const entry of entries) {
    if (seen.has(entry.name)) throw new Error(`${manifest.name}: two entry points are named '${entry.name}'`)
    seen.add(entry.name)
  }
  return { entries, assets }
}

/**
 * The `exports` map of the published package: built JavaScript and declarations in `dist/`.
 */
export function stageExports(entries: readonly ExportEntry[], assets: readonly AssetEntry[]): Record<string, unknown> {
  const exports: Record<string, unknown> = {}
  for (const entry of entries) {
    const declaration = entry.source.replace(/^\.\/src\//, '').replace(/\.tsx?$/, '.d.ts')
    exports[entry.subpath] = { types: `./dist/${declaration}`, default: `./dist/${entry.name}.js` }
  }
  for (const asset of assets) exports[asset.subpath] = `./dist/${asset.name}`
  return exports
}

export interface RewriteOptions {
  readonly version: string
  readonly dir: string
  readonly publishNames: ReadonlySet<string>
}

/**
 * Produces the `package.json` that is published: built exports, real dependency versions,
 * npm metadata, and none of the development-only fields.
 */
export function rewriteManifest(manifest: PackageManifest, options: RewriteOptions): Record<string, unknown> {
  const { entries, assets } = sourceEntries(manifest)
  const exports = stageExports(entries, assets)
  const main = entries.find((entry) => entry.subpath === '.')
  const dependencies: Record<string, string> = {}
  for (const [name, range] of Object.entries(manifest.dependencies ?? {}).sort(([a], [b]) => compare(a, b))) {
    if (!range.startsWith('workspace:')) {
      dependencies[name] = range
    } else if (options.publishNames.has(name)) {
      dependencies[name] = `^${options.version}`
    } else {
      throw new Error(`${manifest.name} depends on '${name}', which is not published`)
    }
  }
  const typesFor = (entry: ExportEntry): string => `./dist/${entry.source.replace(/^\.\/src\//, '').replace(/\.tsx?$/, '.d.ts')}`
  return {
    name: manifest.name,
    version: options.version,
    description: manifest.description,
    license: manifest.license,
    type: 'module',
    sideEffects: assets.length > 0 ? ['**/*.css'] : (manifest.sideEffects ?? false),
    ...(main === undefined ? {} : { main: `./dist/${main.name}.js`, module: `./dist/${main.name}.js`, types: typesFor(main) }),
    exports,
    ...(Object.keys(dependencies).length > 0 ? { dependencies } : {}),
    files: ['dist', 'README.md', 'LICENSE'],
    repository: { type: 'git', url: `git+${REPOSITORY}.git`, directory: `packages/${options.dir}` },
    homepage: `${REPOSITORY}#readme`,
    bugs: { url: `${REPOSITORY}/issues` },
    keywords: ['gambrel', 'bun', 'typescript', 'ssr', 'jsx'],
    publishConfig: { access: 'public' }
  }
}

/**
 * Declaration files use `.js` in relative specifiers, which TypeScript resolves to the `.d.ts`.
 */
export function rewriteDeclarationSpecifiers(source: string): string {
  return source.replace(SPECIFIER, '$1$2.js$3')
}

/**
 * Problems that would make a package unpublishable. An empty list means it is ready.
 */
export function checkManifest(manifest: PackageManifest, publishNames: ReadonlySet<string>): string[] {
  const problems: string[] = []
  const label = manifest.name
  if (!manifest.name.startsWith('@gambrel/')) problems.push(`${label}: the name must be in the @gambrel scope`)
  if (!isSemver(manifest.version)) problems.push(`${label}: '${manifest.version}' is not a valid version`)
  if (manifest.description === undefined || manifest.description.trim() === '') problems.push(`${label}: description is missing`)
  if (manifest.license === undefined || manifest.license === '') problems.push(`${label}: license is missing`)
  if (manifest.exports === undefined) problems.push(`${label}: exports is missing`)
  for (const [name, range] of Object.entries(manifest.dependencies ?? {})) {
    if (range.startsWith('workspace:') && !publishNames.has(name)) problems.push(`${label}: depends on '${name}', which is not published`)
  }
  return problems
}

/**
 * The README published with a package.
 */
export function readmeFor(manifest: PackageManifest): string {
  return [
    `# ${manifest.name}`,
    '',
    manifest.description ?? '',
    '',
    `Part of [Gambrel](${REPOSITORY}), a small TypeScript-first, JSX-based full-stack framework for Bun.`,
    '',
    '## Install',
    '',
    '```bash',
    `bun add ${manifest.name}`,
    '```',
    '',
    '## Documentation',
    '',
    `See the [Gambrel documentation](${REPOSITORY}/tree/master/docs).`,
    '',
    '## License',
    '',
    `Licensed under the ${manifest.license ?? 'license in the LICENSE file'}: noncommercial use only, no distribution, no modification. See the LICENSE file.`,
    ''
  ].join('\n')
}