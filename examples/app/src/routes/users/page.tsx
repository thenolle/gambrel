/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function UsersPage(props: PageProps<ParamsOf<'/users'>, LoaderData<typeof loader>>): Child {
  return (
    <ul>
      {props.data.users.map((user) => (
        <li>
          <a href={`/users/${user.id}`}>{user.name}</a>
        </li>
      ))}
    </ul>
  )
}