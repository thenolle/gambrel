import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { parseBoard, validateTitle, type Task } from './model.ts'

export interface TaskStore {
  list(): Promise<readonly Task[]>
  add(title: string): Promise<void>
  toggle(id: string): Promise<boolean>
  remove(id: string): Promise<boolean>
}

function missing(error: unknown): boolean {
  return typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
}

/**
 * Single-process example storage. Do not share the same file between server processes.
 */
export function createFileStore(file: string): TaskStore {
  let queue: Promise<unknown> = Promise.resolve()

  const read = async (): Promise<Task[]> => {
    try {
      const data = parseBoard(JSON.parse(await readFile(file, 'utf8')))
      return data.tasks.map((task) => ({ ...task }))
    } catch (error) {
      if (missing(error)) return []
      throw error
    }
  }

  const enqueue = <T>(operation: () => Promise<T>): Promise<T> => {
    const next = queue.then(operation)
    queue = next.catch(() => undefined)
    return next
  }

  const write = async (tasks: readonly Task[]): Promise<void> => {
    await mkdir(dirname(file), { recursive: true })
    await writeFile(file, `${JSON.stringify({ tasks }, null, 2)}\n`, 'utf8')
  }

  return {
    list: () => enqueue(read),

    add: (input) => enqueue(async () => {
      const title = validateTitle(input)
      const tasks = await read()
      tasks.push({ id: crypto.randomUUID(), title, done: false })
      await write(tasks)
    }),

    toggle: (id) => enqueue(async () => {
      const tasks = await read()
      const task = tasks.find((entry) => entry.id === id)
      if (task === undefined) return false
      task.done = !task.done
      await write(tasks)
      return true
    }),

    remove: (id) => enqueue(async () => {
      const tasks = await read()
      const next = tasks.filter((task) => task.id !== id)
      if (next.length === tasks.length) return false
      await write(next)
      return true
    })
  }
}