import { join } from 'node:path'
import { serve, type ServerHandle } from '@gambrel/bun'
import { generateRoutes } from '@gambrel/compiler'
import { parsePayload } from '@gambrel/router'
import { Window } from 'happy-dom'

export const appRoot = join(import.meta.dir, '..')

/**
 * Regenerates the route manifests, then serves the application on a free local port.
 */
export async function startTestServer(): Promise<ServerHandle> {
  await generateRoutes({ root: appRoot })
  const { createApplication } = await import('../src/app.ts')
  const app = createApplication({
    development: false,
    entry: '/assets/client.js',
    clientDir: join(appRoot, 'dist', 'client')
  })
  return serve(app, { port: 0, hostname: '127.0.0.1' })
}

export function payloadOf(html: string): ReturnType<typeof parsePayload> {
  const match = /<script type="application\/json" id="gambrel-data" data-gambrel="payload">([\s\S]*?)<\/script>/.exec(html)
  if (match?.[1] === undefined) throw new Error('No hydration payload in the document')
  return parsePayload(match[1])
}

export interface LoadedPage {
  readonly document: Document
  readonly window: Window
  /**
   * The pathname the server saw, for `hydrateRoutes({ pathname })`.
   */
  readonly pathname: string
}

/**
 * Fetches a page from the test server and parses the HTML into a happy-dom document with
 * DOMParser. `mutate` can alter the HTML first. Scripts are neither executed nor fetched.
 */
export async function loadPage(server: ServerHandle, path: string, mutate: (html: string) => string = (html) => html): Promise<LoadedPage> {
  const response = await fetch(new URL(path, server.url))
  const window = new Window({
    url: `http://localhost${path}`,
    settings: {
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableCSSFileLoading: true
    }
  })
  const parsed = new window.DOMParser().parseFromString(mutate(await response.text()), 'text/html')
  return {
    document: parsed as unknown as Document,
    window,
    pathname: new URL(path, 'http://localhost').pathname
  }
}