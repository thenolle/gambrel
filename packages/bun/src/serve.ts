import type { App } from '@gambrel/core'

export interface ServeOptions {
  /**
   * TCP port. Use 0 to let the OS pick a free port. Defaults to 3000.
   */
  readonly port?: number
  /**
   * Interface to bind. Defaults to Bun's default.
   */
  readonly hostname?: string
  /**
   * Enables Bun's development mode (more detailed error pages). Independent of the
   * application's own `development` option. Defaults to false.
   */
  readonly development?: boolean
}

export interface ServerHandle {
  readonly url: URL
  stop(closeActiveConnections?: boolean): Promise<void>
}

/**
 * Serves an application through `Bun.serve`. Every request is passed to `app.fetch`.
 */
export function serve(app: Pick<App, 'fetch'>, options: ServeOptions = {}): ServerHandle {
  const server = Bun.serve({
    port: options.port ?? 3000,
    development: options.development ?? false,
    ...(options.hostname === undefined ? {} : { hostname: options.hostname }),
    fetch: (request: Request) => app.fetch(request)
  })
  return {
    url: server.url,
    stop: (closeActiveConnections = false) => server.stop(closeActiveConnections)
  }
}