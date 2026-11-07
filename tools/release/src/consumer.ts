import { mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { isAbsolute, join, relative, resolve } from 'node:path'
import { PUBLIC_PACKAGES } from './packages.ts'

interface Manifest {
  readonly name: string
  readonly version: string
  readonly dependencies?: Readonly<Record<string, string>>
}

interface RootManifest {
  readonly devDependencies?: Readonly<Record<string, string>>
}

const root = resolve(import.meta.dir, '..', '..', '..')
const stageRoot = join(root, '.release')
const keep = process.argv.includes('--keep')

async function run(
  command: readonly string[],
  cwd: string,
  description: string
): Promise<void> {
  console.log(`\n${description}`)
  const child = Bun.spawn([...command], {
    cwd,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit'
  })
  const code = await child.exited
  if (code !== 0) {
    throw new Error(`${description} failed with exit code ${code}`)
  }
}

async function writeJson(path: string, value: unknown): Promise<void> {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
}

function fileReference(path: string): string {
  return `file:${path.replaceAll('\\', '/')}`
}

function isInside(parent: string, child: string): boolean {
  const path = relative(parent, child)
  return path === '' || (
    path !== '..' &&
    !path.startsWith(`..${process.platform === 'win32' ? '\\' : '/'}`) &&
    !isAbsolute(path)
  )
}

async function loadStagedPackages(): Promise<Array<{
  dir: string
  manifest: Manifest
}>> {
  const packages: Array<{ dir: string; manifest: Manifest }> = []

  for (const dir of PUBLIC_PACKAGES) {
    const path = join(stageRoot, dir, 'package.json')
    let source: string

    try {
      source = await readFile(path, 'utf8')
    } catch {
      throw new Error(
        `Missing staged package '${dir}'. Run 'bun run release build' first.`
      )
    }

    const manifest = JSON.parse(source) as Manifest
    if (
      typeof manifest.name !== 'string' ||
      typeof manifest.version !== 'string'
    ) {
      throw new Error(`Invalid staged manifest: ${path}`)
    }

    packages.push({ dir, manifest })
  }

  const names = new Set(packages.map((pkg) => pkg.manifest.name))
  if (names.size !== packages.length) {
    throw new Error('Staged packages contain duplicate package names')
  }

  for (const pkg of packages) {
    for (const [name, version] of Object.entries(pkg.manifest.dependencies ?? {})) {
      if (version.startsWith('workspace:')) {
        throw new Error(`${pkg.manifest.name} still has workspace dependency '${name}'`)
      }
      if (name.startsWith('@gambrel/') && !names.has(name)) {
        throw new Error(`${pkg.manifest.name} references an unstaged Gambrel package '${name}'`)
      }
    }
  }

  return packages
}

const checkSource = `/** @jsxImportSource @gambrel/view */
import { createApp, json } from '@gambrel/core'
import { renderToString, type Child } from '@gambrel/view'
import {
  Button,
  Field,
  Input,
  NumberInput,
  Combobox,
  DataTable,
  type DataColumn
} from '@gambrel/components'
import { Gambrel, Search } from '@gambrel/icons'
import { Icon } from '@gambrel/icons/registry'
import type { Loader, LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import { createDocumentHandler } from '@gambrel/ssr'

export const loader: Loader<
  ParamsOf<'/users/[id]'>,
  { name: string }
> = (ctx) => ({ name: ctx.params.id })

export function UserPage(
  props: PageProps<ParamsOf<'/users/[id]'>, LoaderData<typeof loader>>
): Child {
  return <h1>{props.data.name}</h1>
}

interface Row {
  name: string
}

const columns: readonly DataColumn<Row>[] = [
  {
    id: 'name',
    header: 'Name',
    text: (row) => row.name,
    compare: (a, b) => a.name.localeCompare(b.name)
  }
]

export function ConsumerPage(): Child {
  return (
    <html lang="en">
      <head><title>Consumer verification</title></head>
      <body>
        <Gambrel title="Gambrel" />
        <Search size={16} />
        <Icon name="check" />
        <Field id="consumer-name" label="Name">
          {(props) => <Input {...props} name="name" />}
        </Field>
        <NumberInput defaultValue={2} min={1} max={10} />
        <Combobox
          id="consumer-country"
          label="Country"
          options={[{ value: 'fr', label: 'France' }]}
          defaultValue="fr"
        />
        <DataTable
          rows={[{ name: 'Ada' }]}
          columns={columns}
          caption="People"
        />
        <Button>Save</Button>
      </body>
    </html>
  )
}

export const app = createApp()
  .get('/health', () => json({ ok: true }))

export const documents = createDocumentHandler<null>({
  routes: [{ id: 'page:/', pattern: '/', layouts: [] }],
  components: new Map([['page:/', ConsumerPage]]),
  hooks: new Map()
})

export const rendered = await renderToString(<ConsumerPage />)
`

const runtimeSource = `import { app, documents, rendered } from './check.tsx'
import { stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

function assert(value: unknown, message: string): asserts value {
  if (!value) throw new Error(message)
}

assert(rendered.includes('Consumer verification'), 'SSR title missing')
assert(rendered.includes('gb-icon-gambrel'), 'Brand icon missing')
assert(rendered.includes('Ada'), 'DataTable content missing')
assert(!rendered.includes('onclick='), 'Event handler leaked into HTML')

const response = await app.fetch(new Request('http://localhost/health'))
assert(response.status === 200, 'Core handler returned the wrong status')
assert((await response.json()).ok === true, 'Core JSON response failed')

const document = await documents.handle(new Request('http://localhost/'), null)
assert(document.status === 200, 'Document handler failed')
assert((await document.text()).includes('<html'), 'Document HTML missing')

const css = fileURLToPath(import.meta.resolve('@gambrel/components/styles.css'))
assert((await stat(css)).isFile(), 'Stylesheet export missing')

console.log('Installed consumer: runtime, SSR, document handler and stylesheet passed')
`

const clientSource = `/** @jsxImportSource @gambrel/view */
import { mount } from '@gambrel/browser'
import { signal } from '@gambrel/reactivity'
import { Button } from '@gambrel/components'
import { Search } from '@gambrel/icons'

const count = signal(0)

export function start(container: Element) {
  return mount(
    container,
    <Button onClick={() => count.update((value) => value + 1)}>
      <Search size={16} />
      {count}
    </Button>
  )
}
`

const browserBuildSource = `const result = await Bun.build({
  entrypoints: ['./client.tsx'],
  outdir: './browser',
  target: 'browser',
  format: 'esm',
  minify: false
})

if (!result.success) {
  throw new Error(result.logs.map((log) => log.message).join('\\n'))
}

if (result.outputs.length === 0) {
  throw new Error('Browser build emitted nothing')
}

console.log('Installed consumer: browser entry bundled successfully')
`

let directory: string | undefined
let succeeded = false

try {
  const packages = await loadStagedPackages()
  const sourceManifest = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8')
  ) as RootManifest

  const typescript = sourceManifest.devDependencies?.['typescript']
  const bunTypes = sourceManifest.devDependencies?.['@types/bun']

  if (typescript === undefined || bunTypes === undefined) {
    throw new Error('Root devDependencies must include typescript and @types/bun')
  }

  directory = await mkdtemp(join(tmpdir(), 'gambrel-consumer-'))
  const tarballs = join(directory, 'tarballs')
  await mkdir(tarballs)

  const dependencies: Record<string, string> = {}

  for (const pkg of packages) {
    const archive = join(tarballs, `${pkg.dir}-${pkg.manifest.version}.tgz`)

    await run(
      [
        process.execPath,
        'pm',
        'pack',
        '--ignore-scripts',
        '--filename',
        archive
      ],
      join(stageRoot, pkg.dir),
      `Pack ${pkg.manifest.name}`
    )

    if (!(await stat(archive)).isFile()) {
      throw new Error(`Tarball was not created: ${archive}`)
    }

    dependencies[pkg.manifest.name] = fileReference(archive)
  }

  await writeJson(join(directory, 'package.json'), {
    name: 'gambrel-isolated-consumer',
    private: true,
    type: 'module',
    dependencies,
    overrides: dependencies,
    devDependencies: {
      typescript,
      '@types/bun': bunTypes
    }
  })

  await writeJson(join(directory, 'tsconfig.json'), {
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'bundler',
      strict: true,
      noUncheckedIndexedAccess: true,
      exactOptionalPropertyTypes: true,
      noEmit: true,
      allowImportingTsExtensions: true,
      jsx: 'react-jsx',
      jsxImportSource: '@gambrel/view',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      types: ['bun'],
      skipLibCheck: false
    },
    include: ['check.tsx', 'client.tsx']
  })

  await writeFile(join(directory, 'check.tsx'), checkSource, 'utf8')
  await writeFile(join(directory, 'runtime.ts'), runtimeSource, 'utf8')
  await writeFile(join(directory, 'client.tsx'), clientSource, 'utf8')
  await writeFile(join(directory, 'browser-build.ts'), browserBuildSource, 'utf8')

  const resolutionSource = `import { realpath } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { isAbsolute, relative, sep } from 'node:path'

const root = await realpath(process.cwd())
const names = ${JSON.stringify(packages.map((pkg) => pkg.manifest.name))}

for (const name of names) {
  const target = await realpath(fileURLToPath(import.meta.resolve(name)))
  const path = relative(root, target)
  if (path === '..' || path.startsWith('..' + sep) || isAbsolute(path)) {
    throw new Error(name + ' resolved outside the isolated consumer: ' + target)
  }
  if (!target.endsWith('.js')) {
    throw new Error(name + ' did not resolve to built JavaScript: ' + target)
  }
}

console.log('Installed consumer: all package entries resolve locally to JavaScript')
`

  await writeFile(join(directory, 'resolution.ts'), resolutionSource, 'utf8')

  console.log(`\nIsolated consumer: ${directory}`)

  await run(
    [process.execPath, 'install', '--ignore-scripts'],
    directory,
    'Install packed packages'
  )

  await run(
    [process.execPath, 'resolution.ts'],
    directory,
    'Check isolated package resolution'
  )

  const installedRoot = await realpath(directory)
  const repoRoot = await realpath(root)

  if (isInside(repoRoot, installedRoot)) {
    throw new Error('Consumer unexpectedly resides inside the repository')
  }

  await run(
    [process.execPath, 'x', '--no-install', 'tsc', '-p', 'tsconfig.json'],
    directory,
    'Typecheck the installed consumer'
  )

  await run(
    [process.execPath, 'runtime.ts'],
    directory,
    'Exercise installed packages at runtime'
  )

  await run(
    [process.execPath, 'browser-build.ts'],
    directory,
    'Bundle installed browser packages'
  )

  succeeded = true
  console.log(`\nConsumer verification passed for ${packages.length} packed packages`)
} catch (error) {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error))

  if (directory !== undefined) {
    console.error(`Temporary consumer preserved for inspection: ${directory}`)
  }

  process.exitCode = 1
} finally {
  if (succeeded && !keep && directory !== undefined) {
    await rm(directory, { recursive: true, force: true })
  } else if (succeeded && directory !== undefined) {
    console.log(`Temporary consumer retained: ${directory}`)
  }
}