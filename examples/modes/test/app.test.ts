import { describe, expect, test } from 'bun:test'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createSite } from '../src/app.ts'
import { createFileStore } from '../src/store.ts'
import type { Mode } from '../src/model.ts'

async function withSite(
  mode: Mode,
  run: (
    app: ReturnType<typeof createSite>,
    file: string
  ) => Promise<void>
): Promise<void> {
  const directory = await mkdtemp(join(tmpdir(), 'gambrel-modes-'))
  const file = join(directory, 'tasks.json')
  const store = createFileStore(file)
  const app = createSite({ mode, store, assets: join(directory, 'assets') })

  try {
    await run(app, file)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

function request(
  path: string,
  init?: RequestInit
): Request {
  return new Request(`http://localhost${path}`, init)
}

function post(title: string, json = false): Request {
  return request('/tasks', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      ...(json ? { accept: 'application/json' } : {})
    },
    body: new URLSearchParams({ title })
  })
}

describe('rendering modes', () => {
  for (const mode of ['ssr', 'csr', 'server'] as const) {
    test(`${mode} returns the expected initial document`, async () => {
      await withSite(mode, async (app) => {
        await app.fetch(post('A saved task'))

        const response = await app.fetch(request('/'))
        const html = await response.text()

        expect(response.status).toBe(200)
        expect(html).toContain(`data-mode="${mode}"`)

        if (mode === 'csr') {
          expect(html).not.toContain('A saved task')
          expect(html).toContain('id="app"')
          expect(html).not.toContain('id="gambrel-data"')
          expect(html).toContain('/assets/client.js')
        } else {
          expect(html).toContain('A saved task')
          expect(html.includes('id="gambrel-data"')).toBe(mode === 'ssr')
          expect(html.includes('/assets/client.js')).toBe(mode === 'ssr')
        }
      })
    })
  }
})

describe('complete task flow', () => {
  test('adds, persists, toggles and deletes a task', async () => {
    await withSite('ssr', async (app, file) => {
      const added = await app.fetch(post('Write examples', true))
      expect(added.status).toBe(200)

      const data = await added.json() as {
        tasks: Array<{ id: string; title: string; done: boolean }>
      }
      const task = data.tasks[0]
      if (task === undefined) throw new Error('Task missing')

      expect(task.title).toBe('Write examples')
      expect(task.done).toBe(false)
      expect((await createFileStore(file).list()).length).toBe(1)

      const toggled = await app.fetch(request(`/tasks/${task.id}/toggle`, {
        method: 'POST',
        headers: { accept: 'application/json' }
      }))
      expect(toggled.status).toBe(200)
      expect((await createFileStore(file).list())[0]?.done).toBe(true)

      const deleted = await app.fetch(request(`/tasks/${task.id}/delete`, {
        method: 'POST'
      }))
      expect(deleted.status).toBe(303)
      expect(deleted.headers.get('location')).toBe('/')
      expect(await createFileStore(file).list()).toEqual([])
    })
  })

  test('native forms redirect; validation errors preserve existing tasks', async () => {
    await withSite('server', async (app) => {
      expect((await app.fetch(post('Keep me'))).status).toBe(303)

      const invalid = await app.fetch(post('', true))
      expect(invalid.status).toBe(400)
      expect(await invalid.json()).toHaveProperty('error')

      const list = await app.fetch(request('/api/tasks'))
      const body = await list.json() as { tasks: Array<{ title: string }> }
      expect(body.tasks.map((task) => task.title)).toEqual(['Keep me'])
    })
  })

  test('rejects foreign origins and missing tasks', async () => {
    await withSite('ssr', async (app) => {
      const foreign = await app.fetch(request('/tasks', {
        method: 'POST',
        headers: {
          origin: 'https://unrelated.example',
          accept: 'application/json'
        },
        body: new URLSearchParams({ title: 'Not allowed' })
      }))
      expect(foreign.status).toBe(403)

      const missing = await app.fetch(request('/tasks/missing/delete', {
        method: 'POST',
        headers: { accept: 'application/json' }
      }))
      expect(missing.status).toBe(404)
    })
  })

  test('concurrent additions do not overwrite one another', async () => {
    await withSite('server', async (app, file) => {
      await Promise.all([
        app.fetch(post('One')),
        app.fetch(post('Two')),
        app.fetch(post('Three'))
      ])

      expect((await createFileStore(file).list()).length).toBe(3)
    })
  })

  test('unknown documents and missing assets return 404', async () => {
    await withSite('ssr', async (app) => {
      expect((await app.fetch(request('/missing'))).status).toBe(404)
      const asset = await app.fetch(request('/assets/missing.js'))
      expect(asset.status).toBe(404)
      expect(asset.headers.get('content-type')).toContain('text/plain')
    })
  })
})