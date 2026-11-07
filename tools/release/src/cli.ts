import { cp, mkdir, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { checkManifest, isSemver, readmeFor, rewriteDeclarationSpecifiers, rewriteManifest, sourceEntries, topologicalOrder, type PackageManifest, type WorkspacePackage } from './lib.ts'
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
  const process_ = Bun.spawn([...cmd], { cwd, stdout: 'inherit', stderr: 'inherit' })
  return process_.exited
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

async function buildPackage(pkg: WorkspacePackage, version: string, builtBefore: readonly string[]): Promise<void> {
  const stage = join(stageRoot, pkg.dir)
  await rm(stage, { recursive: true, force: true })
  await mkdir(join(stage, 'dist'), { recursive: true })
  const { entries, assets } = sourceEntries(pkg.manifest)
  const publishNames = new Set((await loadPackages()).map((item) => item.manifest.name))
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
  await writeFile(
    config,
    JSON.stringify({
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
      },
      include: [join(pkg.path, 'src')]
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
  await writeFile(join(stage, 'README.md'), readmeFor(pkg.manifest), 'utf8')
  await cp(join(root, 'LICENSE'), join(stage, 'LICENSE'))
  console.log(`  built ${pkg.manifest.name}@${version}`)
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
    if (/(?:\bfrom|\bimport\s*\(?)\s*['"]\.{1,2}\/[^'"]*\.tsx?['"]/.test(text)) problems.push(`${manifest.name}: ${file.slice(stage.length + 1)} still imports a TypeScript source file`)
    if (file.endsWith('.js') && /from\s*["'][^"']*jsx-dev-runtime["']/.test(text)) problems.push(`${manifest.name}: ${file.slice(stage.length + 1)} uses the development JSX runtime`)
  }
  const { entries } = sourceEntries(pkg.manifest)
  for (const entry of entries) {
    try {
      const loaded: Record<string, unknown> = await import(pathToFileURL(join(stage, 'dist', `${entry.name}.js`)).href)
      if (Object.keys(loaded).length === 0) problems.push(`${manifest.name}: '${entry.subpath}' exports nothing`)
    } catch (error) {
      problems.push(`${manifest.name}: '${entry.subpath}' failed to import: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return problems
}

async function existsOnRegistry(name: string, version: string): Promise<boolean> {
  const response = await fetch(`https://registry.npmjs.org/${name.replace('/', '%2F')}/${version}`)
  if (response.status === 200) return true
  if (response.status === 404) return false
  throw new Error(`The registry answered ${response.status} for ${name}@${version}`)
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
  await rm(stageRoot, { recursive: true, force: true })
  await mkdir(stageRoot, { recursive: true })
  console.log('Building:')
  const built: string[] = []
  for (const pkg of packages) {
    await buildPackage(pkg, version, built)
    built.push(pkg.dir)
  }
}

async function verify(packages: readonly WorkspacePackage[]): Promise<void> {
  try {
    await stat(stageRoot)
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

async function publish(packages: readonly WorkspacePackage[]): Promise<void> {
  const version = releaseVersion(packages)
  const real = flag('--yes')
  const tag = option('--tag')
  const otp = option('--otp')
  console.log(real ? 'Publishing:' : 'Dry run (add --yes to publish for real):')
  for (const pkg of packages) {
    const name = pkg.manifest.name
    if (await existsOnRegistry(name, version)) {
      console.log(`  skip ${name}@${version} (already published)`)
      continue
    }
    const stage = join(stageRoot, pkg.dir)
    const command = real ? ['bun', 'publish', '--access', 'public', ...(tag === undefined ? [] : ['--tag', tag]), ...(otp === undefined ? [] : ['--otp', otp])] : ['bun', 'pm', 'pack', '--dry-run']
    console.log(`  ${real ? 'publish' : 'pack'} ${name}@${version}`)
    if ((await run(command, stage)) !== 0) throw new Error(`${name}: the command failed; stopping before the next package`)
  }
}

try {
  if (command === 'plan') await plan()
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
        '  plan                 list the packages in publish order',
        '  version <x.y.z>      set the version of every published package',
        '  check                validate manifests, then run typecheck and tests',
        '  build                check, then build every package into .release/',
        '  verify               verify the built packages in .release/',
        '  publish              check, build, verify, then a dry run of the publish',
        '  publish --yes        publish for real (--tag <tag>, --otp <code>)',
        '',
        'Add --skip-tests to skip the typecheck and test run.'
      ].join('\n')
    )
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}