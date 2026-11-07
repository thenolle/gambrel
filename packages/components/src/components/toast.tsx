/** @jsxImportSource @gambrel/view */
import { X } from '@gambrel/icons'
import { signal } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import type { BaseProps } from '../lib/types.ts'

export interface ToastOptions {
  readonly title?: Child
  readonly description?: Child
  readonly variant?: 'default' | 'destructive' | undefined
  /**
   * Milliseconds before the toast disappears. `0` keeps it until dismissed. Default 4000.
   */
  readonly duration?: number | undefined
}

interface ToastEntry extends ToastOptions {
  readonly id: number
}

export interface ToasterProps extends BaseProps {
  readonly position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | undefined
}

const MAX_VISIBLE = 5

/**
 * Creates an independent toast store with its own `toast`, `dismiss` and `Toaster`.
 * With `requireBrowser`, `toast()` throws when no `document` exists, because a module-level
 * store would be shared between requests on a server.
 */
export function createToasts(options: { readonly requireBrowser?: boolean | undefined } = {}) {
  const entries = signal<readonly ToastEntry[]>([])
  let counter = 0

  const dismiss = (id: number): void => {
    entries.update((current) => current.filter((entry) => entry.id !== id))
  }

  const toast = (toastOptions: ToastOptions): number => {
    if (options.requireBrowser === true && typeof document === 'undefined') {
      throw new Error('toast() can only be called in the browser, not while rendering on the server')
    }
    counter += 1
    const id = counter
    entries.update((current) => [...current, { id, ...toastOptions }].slice(-MAX_VISIBLE))
    const duration = toastOptions.duration ?? 4000
    if (duration > 0) setTimeout(() => dismiss(id), duration)
    return id
  }

  function Toaster(props: ToasterProps): Child {
    const { position = 'bottom-right', class: className, children: _children, ...rest } = props
    return (
      <section aria-live="polite" aria-label="Notifications" {...rest} class={cn('gb-toaster', `gb-toaster-${position}`, className)}>
        {() =>
          entries().map((entry) => (
            <div role="status" class={cn('gb-toast', entry.variant === 'destructive' ? 'gb-toast-destructive' : 'gb-toast-default')}>
              <div class="gb-toast-body">
                {entry.title === undefined ? null : <div class="gb-toast-title">{entry.title}</div>}
                {entry.description === undefined ? null : <div class="gb-toast-description">{entry.description}</div>}
              </div>
              <button type="button" class="gb-toast-close" aria-label="Dismiss" onClick={() => dismiss(entry.id)}>
                <X size={14} />
              </button>
            </div>
          ))
        }
      </section>
    )
  }

  return { toast, dismiss, Toaster }
}

const shared = createToasts({ requireBrowser: true })

/**
 * Shows a toast. Browser only. Render one `<Toaster />` in your layout.
 */
export const toast = shared.toast
export const dismissToast = shared.dismiss
export const Toaster = shared.Toaster