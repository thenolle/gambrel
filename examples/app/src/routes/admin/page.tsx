/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server'

export default function AdminPage(props: PageProps<ParamsOf<'/admin'>, LoaderData<typeof loader>>): Child {
  return (
    <section>
      <h1>Admin</h1>
      <p>Signed in as {props.data.user}.</p>
    </section>
  )
}