import { hydrateRoutes } from '@gambrel/browser'
import { components, routes } from '../.gambrel/manifest.client.ts'

try {
  hydrateRoutes({ routes, components })
} catch (error) {
  console.error('[gambrel] hydration failed; the server-rendered page stays as it is', error)
}