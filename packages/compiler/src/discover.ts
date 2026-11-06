import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { CompilerError } from './errors.ts'
import { buildRouteTable, compare, isIgnoredSegment, type RouteTable } from './table.ts'

async function walk(base: string, relativeDir: string, files: string[]): Promise<void> {
  const entries = await readdir(join(base, relativeDir), { withFileTypes: true })
  entries.sort((a, b) => compare(a.name, b.name))
  for (const entry of entries) {
    const path = relativeDir === '' ? entry.name : `${relativeDir}/${entry.name}`
    if (entry.isDirectory()) {
      if (!isIgnoredSegment(entry.name)) await walk(base, path, files)
    } else if (entry.isFile()) {
      files.push(path)
    }
  }
}

function isMissing(error: unknown): boolean {
  return (typeof error === 'object' && error !== null && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR'))
}

/**
 * Reads the routes directory and builds the route table. Throws CompilerError when the
 * directory is missing or the files break the route conventions.
 */
export async function discoverRoutes(routesDir: string): Promise<RouteTable> {
  const files: string[] = []
  try {
    await walk(routesDir, '', files)
  } catch (error) {
    if (isMissing(error)) throw new CompilerError(`Routes directory not found: '${routesDir}'. Create it or set 'routesDir'.`)
    throw error
  }
  return buildRouteTable(files, routesDir)
}