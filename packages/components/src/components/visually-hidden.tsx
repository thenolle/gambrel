import { createPart } from '../lib/part.ts'

/**
 * Content remains available to assistive technology while visually clipped.
 * Do not use this wrapper for focusable controls.
 */
export const VisuallyHidden = createPart('span', 'gb-visually-hidden')