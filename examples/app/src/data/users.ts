export interface User {
  readonly id: string
  readonly name: string
  readonly joined: string
  readonly bio: string
}

const users: readonly User[] = [
  { id: '1', name: 'Ada Lovelace', joined: '1843', bio: 'Wrote the first published algorithm.' },
  { id: '2', name: 'Grace Hopper', joined: '1952', bio: 'Built the first compiler.' },
  { id: '3', name: 'Margaret Hamilton', joined: '1965', bio: 'Led flight software for Apollo.' }
]

export function listUsers(): readonly User[] {
  return users
}

export function findUser(id: string): User | undefined {
  return users.find((user) => user.id === id)
}