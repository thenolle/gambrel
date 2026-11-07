import { stat } from 'node:fs/promises'
import { isAbsolute, join, relative, resolve, sep } from 'node:path'
import { siteRoot } from './bundle.ts'

const directory = resolve(siteRoot, 'dist')
const port = Number(process.env['DOCS_PREVIEW_PORT'] ?? 4001)

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new RangeError('DOCS_PREVIEW_PORT must be between 1 and 65535')
}

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url)
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method Not Allowed', {
        status: 405,
        headers: { allow: 'GET, HEAD' }
      })
    }

    let path: string
    try {
      const decoded = decodeURIComponent(url.pathname)
      if (decoded.includes('\0')) return new Response('Bad Request', { status: 400 })
      path = resolve(directory, `.${decoded}`)
    } catch {
      return new Response('Bad Request', { status: 400 })
    }

    const within = relative(directory, path)
    if (isAbsolute(within) || within === '..' || within.startsWith(`..${sep}`)) {
      return new Response('Not Found', { status: 404 })
    }

    try {
      if ((await stat(path)).isDirectory()) {
        if (!url.pathname.endsWith('/')) {
          url.pathname += '/'
          return Response.redirect(url.href, 308)
        }
        path = join(path, 'index.html')
      }

      if ((await stat(path)).isFile()) {
        const file = Bun.file(path)
        return new Response(request.method === 'HEAD' ? null : file, {
          headers: {
            'content-type': file.type,
            'cache-control': 'no-store'
          }
        })
      }
    } catch {
      const file = Bun.file(join(directory, '404.html'))
      return new Response(request.method === 'HEAD' ? null : file, {
        status: 404,
        headers: { 'content-type': 'text/html; charset=utf-8' }
      })
    }

    return new Response('Not Found', { status: 404 })
  }
})

console.log(`Static documentation preview: http://localhost:${port}/`)