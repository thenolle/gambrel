/** @jsxImportSource @gambrel/view */
import type { LayoutProps, RouteParams } from '@gambrel/router'
import type { Child } from '@gambrel/view'

export default function RootLayout(props: LayoutProps<RouteParams, null>): Child {
  return (
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Gambrel example</title>
      </head>
      <body>
        <nav>
          <a href="/">Home</a> | <a href="/about">About</a> | <a href="/users">Users</a> | <a href="/admin">Admin</a>
        </nav>
        <main>{props.children}</main>
      </body>
    </html>
  )
}