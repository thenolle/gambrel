/**
 * The packages published to npm, by directory name under `packages/`.
 */
export const PUBLIC_PACKAGES = [
  'reactivity',
  'view',
  'core',
  'bun',
  'router',
  'browser',
  'ssr',
  'compiler',
  'icons',
  'components'
] as const

/**
 * Packages that run in the browser as well as on the server. They are bundled for the browser
 * target; the others are bundled for Bun.
 */
export const UNIVERSAL_PACKAGES: ReadonlySet<string> = new Set([
  'reactivity',
  'view',
  'router',
  'browser',
  'icons',
  'components'
])

export const REPOSITORY = 'https://github.com/thenolle/gambrel'