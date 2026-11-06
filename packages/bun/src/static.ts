import { stat } from 'node:fs/promises'
import { resolve, sep } from 'node:path'
import { text, type Middleware } from '@gambrel/core'

export interface StaticFilesOptions {
  /**
   * Directory to serve files from.
   */
  readonly directory: string
  /**
   * URL prefix, for example `/assets`.
   */
  readonly prefix: string
}

function isMissing(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error.code === 'ENOENT' || error.code === 'ENOTDIR')
}

/**
 * Serves files under `prefix` from `directory` for GET and HEAD requests. Requests under
 * the prefix never fall through: a missing file, a directory or a path that escapes the
 * directory is a plain-text 404, so a missing asset can never be answered with an HTML page.
 * Other methods and other paths go to the next handler. Responses use `cache-control: no-cache`.
 */
export function staticFiles(options: StaticFilesOptions): Middleware {
  const directory = resolve(options.directory)
  const prefix = options.prefix.endsWith('/') ? options.prefix : `${options.prefix}/`

  return async (ctx, next) => {
    if ((ctx.method !== 'GET' && ctx.method !== 'HEAD') || !ctx.url.pathname.startsWith(prefix)) return next()
    let relativePath: string
    try {
      relativePath = decodeURIComponent(ctx.url.pathname.slice(prefix.length))
    } catch {
      return text('Bad Request', { status: 400 })
    }
    const path = resolve(directory, relativePath)
    if (relativePath.includes('\0') || !path.startsWith(directory + sep)) return text('Not Found', { status: 404 })
    try {
      if (!(await stat(path)).isFile()) return text('Not Found', { status: 404 })
    } catch (error) {
      if (isMissing(error)) return text('Not Found', { status: 404 })
      throw error
    }
    const file = Bun.file(path)
    return new Response(ctx.method === 'HEAD' ? null : file, {
      headers: { 'content-type': file.type, 'cache-control': 'no-cache' }
    })
  }
}