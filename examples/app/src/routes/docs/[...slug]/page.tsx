/** @jsxImportSource @gambrel/view */
import type { PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'

export default function DocsPage(props: PageProps<ParamsOf<'/docs/[...slug]'>, null>): Child {
  return (
    <section>
      <h1>Docs</h1>
      <p>{props.params.slug.join(' / ')}</p>
    </section>
  )
}