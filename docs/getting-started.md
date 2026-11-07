# Getting started

Run a Gambrel application, explore the rendering modes, and create a typed page.

## Requirements

Bun is the server runtime and workspace package manager.

The examples use TypeScript and JSX. Gambrel has its own JSX runtime; it does not use React.

## Run the file-routing example

```bash
git clone [https://github.com/thenolle/gambrel.git](https://github.com/thenolle/gambrel.git)
cd gambrel
bun install
bun run build
bun run start
```

Open `http://localhost:3000`.

The example includes static pages, dynamic users, nested layouts, server loaders, a guard and browser interaction.

## Explore the rendering modes

From the repository root:

```bash
bun run --filter @gambrel/example-modes ssr
```

Open `http://localhost:3101`.

The other modes are:

```bash
bun run --filter @gambrel/example-modes csr
bun run --filter @gambrel/example-modes server
```

They use ports 3102 and 3103.

Each command builds and starts its application. Each mode stores task data separately.

## Install individual packages

Choose packages for the layer you need:

```bash
bun add @gambrel/core @gambrel/bun
bun add @gambrel/view @gambrel/reactivity @gambrel/browser
bun add @gambrel/router @gambrel/ssr @gambrel/compiler
```

For the component and icon libraries:

```bash
bun add @gambrel/components @gambrel/icons
```

## Configure JSX

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gambrel/view"
  }
}
```

TSX files can also declare the runtime explicitly:

```tsx
/** @jsxImportSource @gambrel/view */
```

## Create a page

```tsx title="src/routes/about/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { Child } from '@gambrel/view'

export default function AboutPage(): Child {
  return (
    <section>
      <h1>About</h1>
      <p>This is a Gambrel page.</p>
    </section>
  )
}
```

Run the application's generation and build commands after adding routes.

## Add typed server data

```ts title="src/routes/hello/[name]/page.server.ts"
import type { Loader, ParamsOf } from '@gambrel/router'

export const loader: Loader<
  ParamsOf<'/hello/[name]'>,
  { greeting: string }
> = ({ params }) => ({
  greeting: `Hello, ${params.name}!`
})
```

```tsx title="src/routes/hello/[name]/page.tsx"
/** @jsxImportSource @gambrel/view */
import type { LoaderData, PageProps, ParamsOf } from '@gambrel/router'
import type { Child } from '@gambrel/view'
import type { loader } from './page.server.ts'

export default function HelloPage(
  props: PageProps<ParamsOf<'/hello/[name]'>, LoaderData<typeof loader>>
): Child {
  return <h1>{props.data.greeting}</h1>
}
```

The loader runs on the server. The component receives the same initial data during hydration.

## Next

- [Tutorial](./tutorial.md)
- [Loaders](./loaders.md)
- [Interactivity](./interactivity.md)
- [Configuration](./configuration.md)
- [License](./license.md)