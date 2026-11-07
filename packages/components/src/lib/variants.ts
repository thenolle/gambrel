import { cn, type ClassValue } from './cn.ts'

type VariantMap = Record<string, Record<string, string>>

export interface VariantsConfig<V extends VariantMap> {
  readonly base?: string
  readonly variants: V
  readonly defaultVariants?: { readonly [K in keyof V]?: keyof V[K] & string }
}

export type VariantChoices<V extends VariantMap> = {
  readonly [K in keyof V]?: (keyof V[K] & string) | undefined
}

/**
 * The variant props of a `variants()` function, for use in component prop types.
 */
export type VariantProps<F> = F extends (props?: infer P) => string ? Omit<NonNullable<P>, 'class'> : never

/**
 * Builds a function that maps variant choices to class names, in the style of cva.
 * Unset choices fall back to `defaultVariants`. A `class` entry is appended last.
 */
export function variants<V extends VariantMap>(config: VariantsConfig<V>): (props?: VariantChoices<V> & { readonly class?: ClassValue }) => string {
  return (props = {}) => {
    const chosen = props as Record<string, string | undefined>
    const defaults = (config.defaultVariants ?? {}) as Record<string, string | undefined>
    const classes: ClassValue[] = [config.base]
    for (const name of Object.keys(config.variants)) {
      const option = chosen[name] ?? defaults[name]
      if (option !== undefined) classes.push(config.variants[name]?.[option])
    }
    classes.push(props.class)
    return cn(...classes)
  }
}