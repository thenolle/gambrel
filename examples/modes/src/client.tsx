/** @jsxImportSource @gambrel/view */
import { hydrateRoutes, mount } from '@gambrel/browser'
import { components, routes } from './manifests.ts'
import { Board } from './ui.tsx'

const mode = document.documentElement.dataset['mode']

if (mode === 'csr') {
  const container = document.getElementById('app')
  if (container === null) throw new Error('CSR container is missing')
  mount(container, <Board initial={[]} loadOnMount />)
} else if (mode === 'ssr') {
  hydrateRoutes({ routes, components })
} else {
  throw new Error(`Unexpected browser entry mode '${String(mode)}'`)
}