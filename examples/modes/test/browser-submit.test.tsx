/** @jsxImportSource @gambrel/view */
import { describe, expect, spyOn, test } from 'bun:test'
import { hydrate, mount } from '@gambrel/browser'
import { renderToString } from '@gambrel/view'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Window } from 'happy-dom'
import { createSite } from '../src/app.ts'
import { snapshotForm } from '../src/form-submission.ts'
import { createFileStore } from '../src/store.ts'
import { Board } from '../src/ui.tsx'

async function waitFor(
  condition: () => boolean,
  message: string
): Promise<void> {
  const deadline = Date.now() + 2000

  while (!condition()) {
    if (Date.now() >= deadline) throw new Error(message)
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

function createDocument(markup = '') {
  const window = new Window({ url: 'http://localhost/' })
  const document = window.document as unknown as Document
  document.body.innerHTML = `<div id="app">${markup}</div>`
  const container = document.getElementById('app')
  if (container === null) throw new Error('Missing test container')
  return { window, document, container }
}

describe('form snapshot ordering', () => {
  test('captures the title before the input becomes disabled', () => {
    const { document } = createDocument(
      '<form action="/tasks"><input name="title" value="Keep this title"></form>'
    )

    const form = document.querySelector('form')
    const input = document.querySelector('input')
    if (form === null || input === null) throw new Error('Missing form controls')

    const before = snapshotForm(form)
    input.disabled = true
    const after = snapshotForm(form)

    expect(before.body.get('title')).toBe('Keep this title')
    expect(after.body.get('title')).toBeNull()
  })
})

describe('browser task submissions', () => {
  for (const mode of ['ssr', 'csr'] as const) {
    test(`${mode} submits the title and persists the task`, async () => {
      const directory = await mkdtemp(join(tmpdir(), 'gambrel-browser-submit-'))
      const store = createFileStore(join(directory, 'tasks.json'))
      const site = createSite({
        mode,
        store,
        assets: join(directory, 'assets')
      })

      const sentTitles: Array<string | null> = []

      const fetchSpy = spyOn(globalThis, 'fetch').mockImplementation(
        (async (input: RequestInfo | URL, init?: RequestInit) => {
          const destination = typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.href
              : input.url

          const url = new URL(destination, 'http://localhost/')
          const headers = new Headers(init?.headers)

          if (init?.method === 'POST') {
            const source = init.body as unknown as {
              entries(): IterableIterator<[string, FormDataEntryValue]>
              get(name: string): FormDataEntryValue | null
            }

            const title = source.get('title')
            sentTitles.push(typeof title === 'string' ? title : null)

            const encoded = new URLSearchParams()
            for (const [key, value] of source.entries()) {
              if (typeof value !== 'string') {
                throw new Error('This task-form test expects text fields only')
              }
              encoded.append(key, value)
            }

            headers.set('content-type', 'application/x-www-form-urlencoded')

            return site.fetch(new Request(url, {
              method: 'POST',
              headers,
              body: encoded
            }))
          }

          return site.fetch(new Request(url, { headers }))
        }) as typeof fetch
      )

      let dispose: (() => void) | undefined

      try {
        const tree = <Board initial={[]} loadOnMount={mode === 'csr'} />
        const dom = createDocument(
          mode === 'ssr' ? await renderToString(tree) : ''
        )

        if (mode === 'ssr') {
          const mismatches: string[] = []
          const root = hydrate(dom.container, tree, {
            onMismatch: (mismatch) => void mismatches.push(mismatch.message)
          })
          dispose = root.dispose
          expect(mismatches).toEqual([])
        } else {
          dispose = mount(dom.container, tree).dispose
        }

        const input = dom.container.querySelector<HTMLInputElement>('input[name="title"]')
        const form = dom.container.querySelector<HTMLFormElement>('.add-form')
        if (input === null || form === null) throw new Error('Missing task form')

        await waitFor(
          () => !input.disabled,
          'The board did not finish its initial load'
        )

        input.value = `${mode} browser task`

        form.dispatchEvent(
          new dom.window.Event('submit', {
            bubbles: true,
            cancelable: true
          }) as unknown as Event
        )

        expect(input.disabled).toBe(true)

        await waitFor(
          () => dom.container.querySelector('.task-title')?.textContent === `${mode} browser task`,
          'The submitted task did not appear'
        )

        expect(sentTitles).toEqual([`${mode} browser task`])
        expect((await store.list()).map((task) => task.title)).toEqual([
          `${mode} browser task`
        ])

        await waitFor(
          () => !input.disabled,
          'The board remained pending after submission'
        )

        expect(input.value).toBe('')
        expect(dom.container.querySelector('[role="alert"]')).toBeNull()
      } finally {
        dispose?.()
        fetchSpy.mockRestore()
        await rm(directory, { recursive: true, force: true })
      }
    })
  }
})