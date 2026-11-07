/** @jsxImportSource @gambrel/view */
import { X } from '@gambrel/icons'
import { effect } from '@gambrel/reactivity'
import type { Child } from '@gambrel/view'
import { cn } from '../lib/cn.ts'
import { renderTrigger, type Trigger, type TriggerProps } from '../lib/overlay.ts'
import { createControllable } from '../lib/state.ts'
import type { BaseProps } from '../lib/types.ts'
import { Button } from './button.tsx'

export interface DialogProps extends BaseProps {
  readonly trigger?: Trigger | undefined
  readonly title?: Child
  readonly description?: Child
  /**
   * Footer content, or a function that receives a `close` function.
   */
  readonly footer?: Child | ((close: () => void) => Child)
  readonly open?: boolean | (() => boolean) | undefined
  readonly defaultOpen?: boolean | undefined
  readonly onOpenChange?: ((open: boolean) => void) | undefined
  /**
   * Base for the element ids. Default `dialog`.
   */
  readonly id?: string | undefined
}

interface ModalProps extends DialogProps {
  readonly role: 'dialog' | 'alertdialog'
  readonly variantClass: string
  readonly dismissOnBackdrop: boolean
  readonly showClose: boolean
}

function Modal(props: ModalProps): Child {
  const {
    trigger,
    title,
    description,
    footer,
    open,
    defaultOpen = false,
    onOpenChange,
    id = 'dialog',
    role,
    variantClass,
    dismissOnBackdrop,
    showClose,
    class: className,
    children,
    ...rest
  } = props
  const state = createControllable<boolean>({ value: open, defaultValue: defaultOpen, onChange: onOpenChange })
  const close = (): void => state.set(false)
  const triggerProps: TriggerProps = {
    onClick: () => state.set(true),
    'aria-haspopup': 'dialog',
    'aria-expanded': () => String(state.get()),
    'aria-controls': id
  }
  return (
    <>
      {trigger === undefined ? null : renderTrigger(trigger, triggerProps)}
      <dialog
        {...rest}
        id={id}
        role={role === 'alertdialog' ? 'alertdialog' : undefined}
        aria-labelledby={title === undefined ? undefined : `${id}-title`}
        aria-describedby={description === undefined ? undefined : `${id}-description`}
        class={cn('gb-dialog', variantClass, className)}
        ref={(element: Element) => {
          const dialog = element as HTMLDialogElement
          effect(() => {
            const wanted = state.get()
            if (wanted && !dialog.open) {
              try {
                dialog.showModal()
              } catch {
                dialog.setAttribute('open', '')
              }
            } else if (!wanted && dialog.open) {
              if (typeof dialog.close === 'function') dialog.close()
              else dialog.removeAttribute('open')
            }
          })
        }}
        onClose={close}
        onClick={(event) => {
          if (dismissOnBackdrop && event.target === event.currentTarget) close()
        }}
      >
        <div class="gb-dialog-panel">
          {showClose ? (
            <button type="button" class="gb-dialog-close" aria-label="Close" onClick={close}>
              <X size={16} />
            </button>
          ) : null}
          {title === undefined && description === undefined ? null : (
            <div class="gb-dialog-header">
              {title === undefined ? null : (
                <h2 id={`${id}-title`} class="gb-dialog-title">
                  {title}
                </h2>
              )}
              {description === undefined ? null : (
                <p id={`${id}-description`} class="gb-dialog-description">
                  {description}
                </p>
              )}
            </div>
          )}
          {children}
          {footer === undefined ? null : <div class="gb-dialog-footer">{typeof footer === 'function' ? footer(close) : footer}</div>}
        </div>
      </dialog>
    </>
  )
}

/**
 * A modal dialog built on the native `<dialog>` element: focus is trapped, Escape closes it,
 * and the page behind is inert. It renders closed and opens in the browser.
 */
export function Dialog(props: DialogProps): Child {
  return <Modal {...props} role="dialog" variantClass="gb-dialog-center" dismissOnBackdrop showClose />
}

export interface AlertDialogProps extends DialogProps {
  readonly cancelLabel?: string | undefined
  readonly actionLabel?: string | undefined
  readonly onAction?: (() => void) | undefined
  /**
   * Style the action as destructive.
   */
  readonly destructive?: boolean | undefined
}

/**
 * A dialog that asks for a decision. It has `role="alertdialog"`, no close button, and
 * does not close when the backdrop is clicked.
 */
export function AlertDialog(props: AlertDialogProps): Child {
  const { cancelLabel = 'Cancel', actionLabel = 'Continue', onAction, destructive = false, footer, ...rest } = props
  return (
    <Modal
      {...rest}
      role="alertdialog"
      variantClass="gb-dialog-center"
      dismissOnBackdrop={false}
      showClose={false}
      footer={
        footer ??
        ((close: () => void) => (
          <>
            <Button variant="outline" onClick={close}>
              {cancelLabel}
            </Button>
            <Button
              variant={destructive ? 'destructive' : 'default'}
              onClick={() => {
                onAction?.()
                close()
              }}
            >
              {actionLabel}
            </Button>
          </>
        ))
      }
    />
  )
}

export interface SheetProps extends DialogProps {
  readonly side?: 'top' | 'right' | 'bottom' | 'left' | undefined
}

/**
 * A dialog docked to one edge of the screen.
 */
export function Sheet(props: SheetProps): Child {
  const { side = 'right', ...rest } = props
  return <Modal {...rest} role="dialog" variantClass={`gb-sheet gb-sheet-${side}`} dismissOnBackdrop showClose />
}