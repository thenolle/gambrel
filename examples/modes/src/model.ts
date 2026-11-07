export type Mode = 'ssr' | 'csr' | 'server'

export type Task = {
  id: string
  title: string
  done: boolean
}

export interface BoardData {
  readonly tasks: readonly Task[]
}

export function parseMode(value: string | undefined): Mode {
  if (value === 'ssr' || value === 'csr' || value === 'server') return value
  throw new TypeError('Mode must be ssr, csr or server')
}

export function isTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) return false
  const task = value as Record<string, unknown>
  return (
    typeof task['id'] === 'string' &&
    task['id'] !== '' &&
    typeof task['title'] === 'string' &&
    typeof task['done'] === 'boolean'
  )
}

export function parseBoard(value: unknown): BoardData {
  if (typeof value !== 'object' || value === null || !('tasks' in value)) {
    throw new TypeError('Invalid task response')
  }
  const tasks: unknown = value.tasks
  if (!Array.isArray(tasks) || !tasks.every(isTask)) {
    throw new TypeError('Invalid task response')
  }
  if (new Set(tasks.map((task) => task.id)).size !== tasks.length) {
    throw new TypeError('Duplicate task IDs')
  }
  return { tasks }
}

export function validateTitle(value: unknown): string {
  if (typeof value !== 'string') throw new TypeError('A task title is required')
  const title = value.trim()
  if (title.length === 0 || title.length > 120) {
    throw new TypeError('Task titles must contain 1–120 characters')
  }
  return title
}