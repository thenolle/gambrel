export { buildApp, buildClient } from './build.ts'
export { defineConfig, loadConfig, resolveConfig, validateConfig } from './config.ts'
export { discoverRoutes } from './discover.ts'
export { CompilerError } from './errors.ts'
export { generateModules, generateRoutes, writeModules } from './generate.ts'
export { buildRouteTable } from './table.ts'
export type { BuildOptions, BuildResult } from './build.ts'
export type { BuildMode, GambrelConfig, ResolvedConfig } from './config.ts'
export type {
  GenerateRoutesOptions,
  GenerateRoutesResult,
  GeneratedFileName,
  GeneratedModules
} from './generate.ts'
export type { RouteSource, RouteTable } from './table.ts'