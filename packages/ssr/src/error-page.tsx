/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'
import type { ErrorInfo } from './types.ts'

const STATUS_TEXT: Readonly<Record<number, string>> = {
  400: 'Bad Request',
  403: 'Forbidden',
  404: 'Not Found',
  405: 'Method Not Allowed',
  500: 'Internal Server Error'
}

export function statusText(status: number): string {
  return STATUS_TEXT[status] ?? `Error ${status}`
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.stack ?? error.message
  return String(error)
}

/**
 * The default error document: status, optional message, and the error in development.
 */
export function renderDefaultError(info: ErrorInfo): Child {
  const title = `${info.status} ${info.statusText}`
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>{title}</title>
      </head>
      <body>
        <h1>{title}</h1>
        {info.message === undefined ? null : <p>{info.message}</p>}
        {info.error === undefined ? null : <pre>{describeError(info.error)}</pre>}
      </body>
    </html>
  )
}