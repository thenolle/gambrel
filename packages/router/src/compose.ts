import { createElement, type Child, type Props } from '@gambrel/view'
import { RouteConfigError } from './pattern.ts'
import type { AnyRouteComponent, ChainEntry, RouteParams } from './types.ts'

/**
 * Builds the component tree for a resolved chain: layouts nest outermost first, the page
 * is innermost, and every entry receives `params` and its own `data`. The server and the
 * browser both call this, which is what keeps their initial trees identical.
 */
export function composeRoute(chain: readonly ChainEntry[], components: ReadonlyMap<string, AnyRouteComponent>, params: RouteParams): Child {
  let tree: Child = null
  for (let index = chain.length - 1; index >= 0; index -= 1) {
    const entry = chain[index]
    if (entry === undefined) continue
    const component = components.get(entry.id)
    if (component === undefined) throw new RouteConfigError(`No component registered for '${entry.id}'`)
    const props: Props = entry.kind === 'page' ? { params, data: entry.data } : { params, data: entry.data, children: tree }
    tree = createElement(component, props)
  }
  return tree
}