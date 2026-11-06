import type { Context } from '@gambrel/core'
import { notFound, type Loader, type ParamsOf } from '@gambrel/router'
import { findUser } from '../../../data/users.ts'

type UserView = { id: string; name: string; joined: string; bio: string }

export const loader: Loader<ParamsOf<'/users/[id]'>, UserView, Context> = (ctx) => {
  const user = findUser(ctx.params.id)
  if (user === undefined) return notFound()
  return { id: user.id, name: user.name, joined: user.joined, bio: user.bio }
}