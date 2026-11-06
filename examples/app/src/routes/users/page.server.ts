import type { Context } from '@gambrel/core'
import type { Loader, ParamsOf } from '@gambrel/router'
import { listUsers } from '../../data/users.ts'

export const loader: Loader<ParamsOf<'/users'>, { users: { id: string; name: string }[] }, Context> = () => ({
  users: listUsers().map((user) => ({ id: user.id, name: user.name }))
})