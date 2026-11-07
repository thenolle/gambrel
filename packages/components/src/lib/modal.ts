import { effect, onCleanup, untrack } from '@gambrel/reactivity'
import { registerLayer } from './overlay.ts'

function restoreFocus(element: Element | null): void {
  if (element === null || !element.isConnected || !('focus' in element)) return
  ;(element as HTMLElement).focus()
}

/**
 * Binds a native dialog to component state without replacing modal behavior
 * with an ordinary open attribute.
 */
export function bindModal(
  dialog: HTMLDialogElement,
  isOpen: () => boolean,
  requestClose: () => void
): void {
  const doc = dialog.ownerDocument
  let previous: Element | null = null
  let unregister: (() => void) | undefined
  let syncing = false
  let disposed = false

  const releaseLayer = (): void => {
    unregister?.()
    unregister = undefined
  }

  const synchronize = (wanted: boolean): void => {
    if (disposed) return

    if (wanted) {
      if (!dialog.open) {
        previous = doc.activeElement
        if (typeof dialog.showModal !== 'function') {
          throw new Error('Dialog requires native HTMLDialogElement.showModal() support')
        }

        syncing = true
        try {
          dialog.showModal()
        } finally {
          syncing = false
        }
      }

      if (unregister === undefined) {
        unregister = registerLayer(dialog, { escape: requestClose })
      }
      return
    }

    releaseLayer()

    if (dialog.open) {
      syncing = true
      try {
        dialog.close()
      } finally {
        syncing = false
      }
    }

    restoreFocus(previous)
    previous = null
  }

  const cancel = (event: Event): void => {
    event.preventDefault()
    requestClose()
  }

  const close = (): void => {
    if (disposed || syncing) return

    if (untrack(isOpen)) requestClose()

    queueMicrotask(() => {
      if (!disposed) synchronize(untrack(isOpen))
    })
  }

  dialog.addEventListener('cancel', cancel)
  dialog.addEventListener('close', close)

  onCleanup(() => {
    disposed = true
    dialog.removeEventListener('cancel', cancel)
    dialog.removeEventListener('close', close)
    releaseLayer()

    if (dialog.open) dialog.close()

    restoreFocus(previous)
    previous = null
  })

  effect(() => synchronize(isOpen()))
}