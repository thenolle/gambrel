/** @jsxImportSource @gambrel/view */
import type { LayoutProps, LoaderData, RouteParams } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './layout.server.ts'

export default function UsersLayout(props: LayoutProps<RouteParams, LoaderData<typeof loader>>): Child {
  return (
    <section>
      <p>{props.data.total} users</p>
      {props.children}
    </section>
  )
}