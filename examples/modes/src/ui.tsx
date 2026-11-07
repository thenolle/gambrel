/** @jsxImportSource @gambrel/view */
import { onCleanup, signal } from '@gambrel/reactivity'
import { Alert, AlertDescription, AlertTitle, Badge, Button, EmptyState, Field, Input } from '@gambrel/components'
import { Gambrel } from '@gambrel/icons'
import type { LayoutProps, PageProps, RouteParams } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import { parseBoard, type Mode, type Task } from './model.ts'
import { snapshotForm } from './form-submission.ts'

export type TaskPageData = {
  tasks: Task[]
}

export type RootData = {
  mode: Mode
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'The request failed'
}

export function Board(props: {
  readonly initial: readonly Task[]
  readonly loadOnMount?: boolean | undefined
}): Child {
  const tasks = signal<readonly Task[]>(props.initial)
  const pending = signal(false)
  const loading = signal(props.loadOnMount === true)
  const error = signal('')
  let form: HTMLFormElement | undefined

  const label = (): string => {
    if (loading()) return 'Loading tasks…'
    const remaining = tasks().filter((task) => !task.done).length
    return `${remaining} remaining · ${tasks().length} total`
  }

  return (
    <section
      class="board"
      aria-label="Task board"
      ref={(element: Element) => {
        let disposed = false
        let controller: AbortController | undefined

        const request = async (
          path: string,
          init?: RequestInit
        ): Promise<readonly Task[]> => {
          controller = new AbortController()
          const response = await fetch(path, {
            ...init,
            signal: controller.signal,
            headers: {
              ...Object.fromEntries(new Headers(init?.headers).entries()),
              accept: 'application/json'
            }
          })

          const value: unknown = await response.json()
          if (!response.ok) {
            const detail = typeof value === 'object' &&
              value !== null &&
              'error' in value &&
              typeof value.error === 'string'
              ? value.error
              : `Request failed (${response.status})`
            throw new Error(detail)
          }
          return parseBoard(value).tasks
        }

        const load = async (): Promise<void> => {
          loading.set(true)
          error.set('')
          try {
            const next = await request('/api/tasks')
            if (!disposed) tasks.set(next)
          } catch (failure) {
            if (!disposed) error.set(message(failure))
          } finally {
            if (!disposed) loading.set(false)
          }
        }

        const submit = async (event: Event): Promise<void> => {
          const target = event.target as HTMLFormElement | null
          if (target === null || target.tagName !== 'FORM') return

          event.preventDefault()
          if (pending() || loading()) return

          try {
            const submission = snapshotForm(target)

            pending.set(true)
            error.set('')

            const next = await request(submission.action, {
              method: 'POST',
              body: submission.body
            })

            if (!disposed) {
              tasks.set(next)
              if (target === form) target.reset()
            }
          } catch (failure) {
            if (!disposed) error.set(message(failure))
          } finally {
            if (!disposed) pending.set(false)
          }
        }

        const onSubmit = (event: Event): void => {
          void submit(event)
        }

        element.addEventListener('submit', onSubmit)

        onCleanup(() => {
          disposed = true
          controller?.abort()
          element.removeEventListener('submit', onSubmit)
        })

        if (props.loadOnMount === true) void load()
      }}
    >
      <p role="status" aria-live="polite" class="board-status">{label}</p>

      {() => error() === '' ? null : (
        <Alert variant="destructive">
          <AlertTitle>Could not save your changes</AlertTitle>
          <AlertDescription>
            {error()} Your previous task list has been kept.
          </AlertDescription>
        </Alert>
      )}

      <form
        action="/tasks"
        method="post"
        class="add-form"
        ref={(element: Element) => {
          form = element as HTMLFormElement
        }}
      >
        <Field id="task-title" label="New task">
          {(field) => (
            <Input
              {...field}
              name="title"
              required
              maxlength={120}
              placeholder="What needs doing?"
              autocomplete="off"
              disabled={() => pending() || loading()}
            />
          )}
        </Field>
        <Button type="submit" disabled={() => pending() || loading()}>
          {() => pending() ? 'Saving…' : 'Add task'}
        </Button>
      </form>

      {() => {
        if (loading()) return <p class="notice">Loading your saved tasks…</p>

        if (tasks().length === 0) {
          return (
            <EmptyState
              title="A clear board"
              description="Add your first task above. Tasks are saved on this server."
            />
          )
        }

        return (
          <ul class="tasks">
            {tasks().map((task) => (
              <li class="task" data-done={String(task.done)}>
                <span class="task-title">{task.title}</span>
                <form action={`/tasks/${task.id}/toggle`} method="post">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    disabled={pending}
                    aria-label={`${task.done ? 'Reopen' : 'Complete'} ${task.title}`}
                  >
                    {task.done ? 'Reopen' : 'Complete'}
                  </Button>
                </form>
                <form action={`/tasks/${task.id}/delete`} method="post">
                  <Button
                    type="submit"
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    aria-label={`Delete ${task.title}`}
                  >
                    Delete
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )
      }}
    </section>
  )
}

export function RootLayout(props: LayoutProps<RouteParams, RootData>): Child {
  return (
    <html lang="en" data-mode={props.data.mode}>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Task board · Gambrel</title>
        <link rel="stylesheet" href="/assets/components.css" />
        <link rel="stylesheet" href="/assets/app.css" />
      </head>
      <body>
        <main class="page">
          <header class="page-header">
            <Gambrel size={32} />
            <div>
              <h1>Task board</h1>
              <p>A complete small Gambrel application</p>
            </div>
            <Badge variant="secondary">{props.data.mode}</Badge>
          </header>
          {props.children}
          <footer class="page-footer">
            <a href="/">Reload board</a>
            <span>Single-user demo · JSON-file storage</span>
          </footer>
        </main>
      </body>
    </html>
  )
}

export function TaskPage(props: PageProps<RouteParams, TaskPageData>): Child {
  return <Board initial={props.data.tasks} />
}

export function CsrShell(): Child {
  return (
    <RootLayout params={{}} data={{ mode: 'csr' }}>
      <div id="app">
        <p>Loading the client application…</p>
        <noscript>This CSR example requires JavaScript.</noscript>
      </div>
      <script type="module" src="/assets/client.js"></script>
    </RootLayout>
  )
}