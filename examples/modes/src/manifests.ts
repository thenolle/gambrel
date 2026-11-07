import type { AnyRouteComponent, RouteRecord } from '@gambrel/router'
import { RootLayout, TaskPage } from './ui.tsx'

export const routes: readonly RouteRecord[] = [
  { id: 'page:/', pattern: '/', layouts: ['layout:/'] }
]

export const components: ReadonlyMap<string, AnyRouteComponent> =
  new Map<string, AnyRouteComponent>([
    ['layout:/', RootLayout],
    ['page:/', TaskPage]
  ])