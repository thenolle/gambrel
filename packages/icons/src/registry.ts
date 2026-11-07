import type { Child } from '@gambrel/view'
import { registry, type IconName } from './generated/registry.ts'
import type { IconProps } from './types.ts'

export { registry }
export type { IconName }

/**
 * Renders an icon by name. Importing this entry point includes every icon in your bundle, so
 * prefer the named icon components when you only need a few.
 */
export function Icon(props: IconProps & { readonly name: IconName }): Child {
  const { name, ...rest } = props
  const component = registry[name]
  if (component === undefined) throw new Error(`Unknown icon '${String(name)}'`)
  return component(rest)
}