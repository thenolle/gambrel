export interface FormSubmission {
  readonly action: string
  readonly body: FormData
}

/**
 * Captures successful controls before pending state can disable them.
 * Uses the form's own window so DOM-based tests use the matching FormData implementation.
 */
export function snapshotForm(form: HTMLFormElement): FormSubmission {
  const view = form.ownerDocument.defaultView
  if (view === null) throw new Error('Cannot submit a form without an associated window')

  return {
    action: form.action,
    body: new view.FormData(form)
  }
}