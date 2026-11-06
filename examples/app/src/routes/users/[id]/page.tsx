/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function UserPage(props: PageProps<ParamsOf<'/users/[id]'>, LoaderData<typeof loader>>): Child {
  return (
    <article>
      <h1>{props.data.name}</h1>
      <p>
        User #{props.params.id}, joined {props.data.joined}
      </p>
      <p>{props.data.bio}</p>
    </article>
  )
}