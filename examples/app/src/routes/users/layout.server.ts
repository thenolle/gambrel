import type { Context } from '@gambrel/core'
import type { Loader, ParamsOf } from '@gambrel/router'
import { listUsers } from '../../data/users.ts'

export const loader: Loader<ParamsOf<'/users'>, { total: number }, Context> = () => ({
  total: listUsers().length
})