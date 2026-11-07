import { cp, mkdir, readdir, readFile, rm, stat, symlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { createInterface } from 'node:readline/promises'
import { pathToFileURL } from 'node:url'
import { checkManifest, importsTypeScriptSource, isSemver, rewriteDeclarationSpecifiers, rewriteManifest, sourceEntries, topologicalOrder, type PackageManifest, type WorkspacePackage } from './lib.ts'
import { PUBLIC_PACKAGES, UNIVERSAL_PACKAGES } from './packages.ts'

const root = join(import.meta.dir, '..', '..', '..')
const stageRoot = join(root, '.release')
const args = process.argv.slice(2)
const command = args[0] ?? 'help'

function flag(name: string): boolean {
  return args.includes(name)
}

function option(name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

async function run(cmd: readonly string[], cwd: string): Promise<number> {
  const child = Bun.spawn([...cmd], { cwd, stdout: 'inherit', stderr: 'inherit' })
  return child.exited
}

async function ask(question: string): Promise<string> {
  const lines = createInterface({ input: process.stdin, output: process.stdout })
  try {
    return (await lines.question(question)).trim().toLowerCase()
  } finally {
    lines.close()
  }
}

async function loadPackages(): Promise<WorkspacePackage[]> {
  const packages = await Promise.all(
    PUBLIC_PACKAGES.map(async (dir): Promise<WorkspacePackage> => {
      const path = join(root, 'packages', dir)
      return { dir, path, manifest: JSON.parse(await readFile(join(path, 'package.json'), 'utf8')) as PackageManifest }
    })
  )
  return topologicalOrder(packages)
}

function releaseVersion(packages: readonly WorkspacePackage[]): string {
  const versions = new Set(packages.map((pkg) => pkg.manifest.version))
  if (versions.size !== 1) throw new Error(`All packages must share one version, found: ${[...versions].join(', ')}. Run 'release version <x.y.z>'.`)
  return [...versions][0] ?? ''
}

async function walk(directory: string): Promise<string[]> {
  const files: string[] = []
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) files.push(...(await walk(path)))
    else files.push(path)
  }
  return files
}

function collectTargets(value: unknown): string[] {
  if (typeof value === 'string') return [value]
  if (typeof value === 'object' && value !== null) return Object.values(value).flatMap(collectTargets)
  return []
}

async function stagedExportsMap(names: readonly string[]): Promise<Record<string, string[]>> {
  const paths: Record<string, string[]> = {}
  for (const dir of names) {
    const manifest = JSON.parse(await readFile(join(stageRoot, dir, 'package.json'), 'utf8')) as PackageManifest
    for (const [subpath, target] of Object.entries(manifest.exports ?? {})) {
      const types = typeof target === 'object' && target !== null ? (target as Record<string, unknown>)['types'] : undefined
      if (typeof types !== 'string') continue
      const specifier = subpath === '.' ? manifest.name : `${manifest.name}/${subpath.slice(2)}`
      paths[specifier] = [join(stageRoot, dir, types)]
    }
  }
  return paths
}

async function buildPackage(pkg: WorkspacePackage, version: string, builtBefore: readonly string[], publishNames: ReadonlySet<string>): Promise<void> {
  const stage = join(stageRoot, pkg.dir)
  await rm(stage, { recursive: true, force: true })
  await mkdir(join(stage, 'dist'), { recursive: true })
  const { entries, assets } = sourceEntries(pkg.manifest)
  const previousEnv = process.env['NODE_ENV']
  process.env['NODE_ENV'] = 'production'
  let output: Bun.BuildOutput
  try {
    output = await Bun.build({
      entrypoints: entries.map((entry) => join(pkg.path, entry.source)),
      outdir: join(stage, 'dist'),
      target: UNIVERSAL_PACKAGES.has(pkg.dir) ? 'browser' : 'bun',
      format: 'esm',
      packages: 'external',
      splitting: entries.length > 1,
      naming: { entry: '[name].[ext]', chunk: 'chunks/[name]-[hash].[ext]' },
      define: { 'process.env.NODE_ENV': '"production"' },
      minify: false
    })
  } catch (error) {
    throw new Error(`${pkg.manifest.name}: bundling failed: ${error instanceof AggregateError ? error.errors.map(String).join('; ') : String(error)}`)
  } finally {
    if (previousEnv === undefined) delete process.env['NODE_ENV']
    else process.env['NODE_ENV'] = previousEnv
  }
  if (!output.success) throw new Error(`${pkg.manifest.name}: bundling failed: ${output.logs.map((log) => log.message).join('; ')}`)
  const config = join(stageRoot, `${pkg.dir}.tsconfig.json`)
  await writeFile(config, JSON.stringify({
    extends: join(root, 'tsconfig.base.json'),
    compilerOptions: {
      noEmit: false,
      declaration: true,
      emitDeclarationOnly: true,
      outDir: join(stage, 'dist'),
      rootDir: join(pkg.path, 'src'),
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      types: ['bun'],
      skipLibCheck: true,
      paths: await stagedExportsMap(builtBefore)
    }, include: [join(pkg.path, 'src')]
  })
  )
  if ((await run([process.execPath, 'x', 'tsc', '-p', config], root)) !== 0) throw new Error(`${pkg.manifest.name}: declaration build failed`)
  for (const file of await walk(join(stage, 'dist'))) {
    if (!file.endsWith('.d.ts')) continue
    const source = await readFile(file, 'utf8')
    const rewritten = rewriteDeclarationSpecifiers(source)
    if (rewritten !== source) await writeFile(file, rewritten, 'utf8')
  }
  for (const asset of assets) await cp(join(pkg.path, asset.file), join(stage, 'dist', asset.name))
  const manifest = rewriteManifest(pkg.manifest, { version, dir: pkg.dir, publishNames })
  await writeFile(join(stage, 'package.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8')
  const readme = await readFile(join(pkg.path, 'README.md'), 'utf8')
  if (!readme.startsWith(`# ${pkg.manifest.name}\n`)) throw new Error(`${pkg.manifest.name}: README.md must start with '# ${pkg.manifest.name}'`)
  await writeFile(join(stage, 'README.md'), readme, 'utf8')
  await cp(join(root, 'LICENSE'), join(stage, 'LICENSE'))
  console.log(`  built ${pkg.manifest.name}@${version}`)
}

/**
 * Makes the built packages resolve each other the way installed packages would, by linking
 * them into `.release/node_modules/@gambrel`.
 */
async function linkStaged(packages: readonly WorkspacePackage[]): Promise<void> {
  const scope = join(stageRoot, 'node_modules', '@gambrel')
  await mkdir(scope, { recursive: true })
  for (const pkg of packages) await symlink(join(stageRoot, pkg.dir), join(scope, pkg.dir), 'junction')
}

async function verifyPackage(pkg: WorkspacePackage): Promise<string[]> {
  const stage = join(stageRoot, pkg.dir)
  const problems: string[] = []
  const manifest = JSON.parse(await readFile(join(stage, 'package.json'), 'utf8')) as PackageManifest
  for (const target of collectTargets(manifest.exports)) {
    try {
      await stat(join(stage, target))
    } catch {
      problems.push(`${manifest.name}: export target ${target} does not exist`)
    }
  }
  for (const file of await walk(join(stage, 'dist'))) {
    if (!/\.(?:js|d\.ts)$/.test(file)) continue
    const text = await readFile(file, 'utf8')
    const name = file.slice(stage.length + 1)
    if (importsTypeScriptSource(text)) problems.push(`${manifest.name}: ${name} still imports a TypeScript source file`)
    if (file.endsWith('.js') && /from\s*["'][^"']*jsx-dev-runtime["']/.test(text)) problems.push(`${manifest.name}: ${name} uses the development JSX runtime`)
  }
  for (const entry of sourceEntries(pkg.manifest).entries) {
    try {
      const loaded: Record<string, unknown> = await import(pathToFileURL(join(stage, 'dist', `${entry.name}.js`)).href)
      if (Object.keys(loaded).length === 0) problems.push(`${manifest.name}: '${entry.subpath}' exports nothing`)
    } catch (error) {
      problems.push(`${manifest.name}: '${entry.subpath}' failed to import: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return problems
}

async function registryStatus(name: string, version?: string): Promise<number> {
  const path = `${name.replace('/', '%2F')}${version === undefined ? '' : `/${version}`}`
  return (await fetch(`https://registry.npmjs.org/${path}`)).status
}

async function existsOnRegistry(name: string, version: string): Promise<boolean> {
  const status = await registryStatus(name, version)
  if (status === 200) return true
  if (status === 404) return false
  throw new Error(`The registry answered ${status} for ${name}@${version}`)
}

async function plan(): Promise<void> {
  const packages = await loadPackages()
  console.log('Publish order:')
  for (const pkg of packages) {
    const dependencies = Object.keys(pkg.manifest.dependencies ?? {}).filter((name) => name.startsWith('@gambrel/'))
    console.log(`  ${pkg.manifest.name}@${pkg.manifest.version}  ${dependencies.length === 0 ? '' : `(needs ${dependencies.join(', ')})`}`)
  }
}

async function check(): Promise<WorkspacePackage[]> {
  const packages = await loadPackages()
  const names = new Set(packages.map((pkg) => pkg.manifest.name))
  const problems = packages.flatMap((pkg) => checkManifest(pkg.manifest, names))
  if (problems.length > 0) throw new Error(`Not ready to publish:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`)
  releaseVersion(packages)
  if (!flag('--skip-tests')) {
    console.log('Running typecheck and tests...')
    if ((await run(['bun', 'run', 'typecheck'], root)) !== 0) throw new Error('Typecheck failed')
    if ((await run(['bun', 'test'], root)) !== 0) throw new Error('Tests failed')
  }
  return packages
}

async function build(packages: readonly WorkspacePackage[]): Promise<void> {
  const version = releaseVersion(packages)
  const publishNames = new Set(packages.map((pkg) => pkg.manifest.name))
  await rm(stageRoot, { recursive: true, force: true })
  await mkdir(stageRoot, { recursive: true })
  console.log('Building:')
  const built: string[] = []
  for (const pkg of packages) {
    await buildPackage(pkg, version, built, publishNames)
    built.push(pkg.dir)
  }
  await linkStaged(packages)
}

async function verify(packages: readonly WorkspacePackage[]): Promise<void> {
  try {
    await stat(join(stageRoot, 'node_modules'))
  } catch {
    throw new Error("Nothing to verify: run 'bun run release build' first.")
  }
  console.log('Verifying:')
  const problems: string[] = []
  for (const pkg of packages) problems.push(...(await verifyPackage(pkg)))
  if (problems.length > 0) throw new Error(`Verification failed:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`)
  console.log(`  ${packages.length} packages verified`)
}

async function setVersion(next: string | undefined): Promise<void> {
  if (next === undefined || !isSemver(next)) throw new Error('Usage: release version <x.y.z>')
  for (const pkg of await loadPackages()) {
    const file = join(pkg.path, 'package.json')
    const source = await readFile(file, 'utf8')
    await writeFile(file, source.replace(/("version"\s*:\s*")[^"]+(")/, `$1${next}$2`), 'utf8')
  }
  console.log(`All published packages are now at ${next}`)
}

async function doctor(): Promise<void> {
  console.log(`bun ${Bun.version}`)
  const npm = Bun.which('npm')
  console.log(npm === null ? 'npm: not found (publishing with bun works with a token)' : `npm: ${npm}`)
  const token = process.env['NPM_CONFIG_TOKEN'] ?? process.env['NODE_AUTH_TOKEN']
  console.log(token === undefined ? 'token variable: not set' : 'token variable: set')
  if (npm !== null) {
    console.log('npm login status:')
    if ((await run(['npm', 'whoami'], root)) !== 0) console.log('  not logged in: run "npm login"')
  }
  const status = await registryStatus('@gambrel/core')
  console.log(status === 404 ? '@gambrel/core: not on npm yet (expected for a first release)' : status === 200 ? '@gambrel/core: already exists on npm. If you did not publish it, the @gambrel scope belongs to someone else.' : `@gambrel/core: the registry answered ${status}`)
  console.log('The @gambrel scope must belong to you: create the organization "gambrel" at https://www.npmjs.com/org/create')
}

async function publish(packages: readonly WorkspacePackage[]): Promise<void> {
  const version = releaseVersion(packages)
  const expected = option('--expect-version')?.replace(/^v/, '')
  if (expected !== undefined && expected !== version) throw new Error(`Version mismatch: expected ${expected}, but the packages are at ${version}`)
  const pending: WorkspacePackage[] = []
  for (const pkg of packages) {
    if (await existsOnRegistry(pkg.manifest.name, version)) console.log(`  skip ${pkg.manifest.name}@${version} (already published)`)
    else pending.push(pkg)
  }
  if (pending.length === 0) {
    console.log('Nothing to publish: every package is already on the registry.')
    return
  }
  console.log(`Contents of the ${pending.length} package(s) to publish:`)
  for (const pkg of pending) {
    console.log(`\n${pkg.manifest.name}@${version}`)
    if ((await run(['bun', 'pm', 'pack', '--dry-run'], join(stageRoot, pkg.dir))) !== 0) console.log('  (could not list the contents)')
  }
  let real = flag('--yes')
  if (!real && process.stdin.isTTY) real = (await ask(`\nPublish ${pending.length} package(s) to npm as ${version}? Type "yes" to continue: `)) === 'yes'
  if (!real) {
    console.log('Nothing was published. Run again and answer "yes", or use --yes.')
    return
  }
  const client = option('--client') ?? (Bun.which('npm') === null ? 'bun' : 'npm')
  const tag = option('--tag')
  const otp = option('--otp')
  console.log('Publishing:')
  for (const pkg of pending) {
    const common = ['publish', '--access', 'public', ...(tag === undefined ? [] : ['--tag', tag]), ...(otp === undefined ? [] : ['--otp', otp])]
    const cmd = client === 'npm' ? ['npm', ...common, ...(flag('--provenance') ? ['--provenance'] : [])] : ['bun', ...common]
    console.log(`  publish ${pkg.manifest.name}@${version}`)
    if ((await run(cmd, join(stageRoot, pkg.dir))) !== 0) throw new Error(`${pkg.manifest.name}: publishing failed. Fix the problem and run again; packages already published are skipped.`)
  }
  console.log(`\nPublished ${pending.length} package(s) as ${version}.`)
}

try {
  if (command === 'plan') await plan()
  else if (command === 'doctor') await doctor()
  else if (command === 'version') await setVersion(args[1])
  else if (command === 'check') await check()
  else if (command === 'build') await build(await check())
  else if (command === 'verify') await verify(await loadPackages())
  else if (command === 'publish') {
    const packages = await check()
    await build(packages)
    await verify(packages)
    await publish(packages)
  } else {
    console.log(
      [
        'Usage: bun run release <command>',
        '',
        '  doctor               check your npm setup',
        '  plan                 list the packages in publish order',
        '  version <x.y.z>      set the version of every published package',
        '  check                validate manifests, then run typecheck and tests',
        '  build                check, then build every package into .release/',
        '  verify               verify the built packages in .release/',
        '  publish              check, build, verify, show the contents, then ask before publishing',
        '',
        'Publish options: --yes (no question), --tag <tag>, --otp <code>, --client npm|bun,',
        '  --provenance (with --client npm, in a supported CI), --expect-version <x.y.z>',
        'Add --skip-tests to skip the typecheck and test run.'
      ].join('\n')
    )
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}