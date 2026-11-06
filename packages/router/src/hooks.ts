import { RouteConfigError } from './pattern.ts'
import type { EntryHooks } from './types.ts'

const ALLOWED_EXPORTS: ReadonlySet<string> = new Set(['loader', 'beforeLoad'])

/**
 * Builds hooks from a `*.server.ts` module namespace. The module may export only
 * `loader` and `beforeLoad`, both functions, and at least one of them. Anything else
 * throws, so a misnamed export is never silently ignored.
 */
export function hooksFromModule(id: string, module: Readonly<Record<string, unknown>>): EntryHooks<never> {
  for (const name of Object.keys(module)) {
    if (!ALLOWED_EXPORTS.has(name)) throw new RouteConfigError(`Server module for '${id}' exports '${name}'; only 'loader' and 'beforeLoad' are allowed`)
  }
  const loader = module['loader']
  const guard = module['beforeLoad']
  if (loader === undefined && guard === undefined) throw new RouteConfigError(`Server module for '${id}' must export 'loader' or 'beforeLoad'`)
  for (const [name, value] of [['loader', loader], ['beforeLoad', guard]] as const) {
    if (value !== undefined && typeof value !== 'function') throw new RouteConfigError(`Export '${name}' of the server module for '${id}' must be a function`)
  }
  return {
    guard: guard as EntryHooks<never>['guard'],
    loader: loader as EntryHooks<never>['loader']
  }
}