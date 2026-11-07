import { root } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { DOCUMENT_NODE_TYPE, describePath, removeAllChildren, removeLeftovers, renderChild, type HydrationMismatch, type Position, type RenderContext } from './runtime.ts'

export type { HydrationMismatch } from './runtime.ts'

export interface MountedRoot {
  /**
   * Stops reactive updates and removes event listeners. For `mount`, also removes the
   * nodes it created. Safe to call more than once.
   */
  dispose(): void
}

export interface HydrateOptions {
  /**
   * Called for every mismatch between server markup and the client tree.
   * Defaults to `console.error`.
   */
  readonly onMismatch?: (mismatch: HydrationMismatch) => void
}

export interface HydratedRoot extends MountedRoot {
  readonly mismatches: readonly HydrationMismatch[]
}

/**
 * Renders a tree into `container`, replacing its children. The document is taken from
 * the container, so no browser global is read.
 */
export function mount(container: Element, tree: Child): MountedRoot {
  removeAllChildren(container)
  const context: RenderContext = { document: container.ownerDocument, root: container, report: () => undefined }
  const dispose = root((disposeRoot) => {
    renderChild(tree, { parent: container, next: null, hydrating: false, svg: false }, context)
    return disposeRoot
  })
  return {
    dispose: () => {
      dispose()
      removeAllChildren(container)
    }
  }
}

/**
 * Adopts server-rendered DOM in `container` and attaches listeners and reactive effects.
 * Matching DOM is preserved. Mismatches are reported and repaired locally: see
 * docs/browser.md for the policy. Disposal leaves the DOM in place.
 */
export function hydrate(container: Element | Document, tree: Child, options: HydrateOptions = {}): HydratedRoot {
  const document = container.nodeType === DOCUMENT_NODE_TYPE ? (container as Document) : (container as Element).ownerDocument
  const mismatches: HydrationMismatch[] = []
  const handle = options.onMismatch ?? ((mismatch: HydrationMismatch): void => {
    console.error(`[gambrel] hydration mismatch at "${mismatch.path}": ${mismatch.message}`)
  })
  const context: RenderContext = {
    document,
    root: container,
    report: (message, near) => {
      const mismatch: HydrationMismatch = { message, path: describePath(near, container) }
      mismatches.push(mismatch)
      handle(mismatch)
    }
  }
  const position: Position = { parent: container, next: container.firstChild, hydrating: true, svg: false }
  const dispose = root((disposeRoot) => {
    renderChild(tree, position, context)
    removeLeftovers(position, context)
    return disposeRoot
  })
  return { dispose, mismatches }
}