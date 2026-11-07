# Installing packages

Gambrel is distributed as modular ESM packages. Install the packages needed by your application rather than importing server, browser and build tools into one entry point.

## HTTP applications

```bash
bun add @gambrel/core @gambrel/bun
```

Use core for handlers, middleware and responses. Use the Bun adapter to start the server and serve public assets.

```ts
import { serve } from '@gambrel/bun'
import { createApp, json } from '@gambrel/core'

const app = createApp()
  .get('/health', () => json({ ok: true }))

serve(app, { port: 3000 })
```

## JSX and browser interfaces

```bash
bun add @gambrel/view @gambrel/reactivity @gambrel/browser
```

Configure the JSX runtime:

```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@gambrel/view"
  }
}
```

Use `@gambrel/view` for components and HTML rendering, `@gambrel/reactivity` for state, and `@gambrel/browser` for mounting or hydration.

## Routed server-rendered applications

```bash
bun add @gambrel/router @gambrel/ssr @gambrel/compiler
```

These packages provide route resolution, document responses and build orchestration. Combine them with the HTTP and view packages.

Keep compiler imports in build scripts. Keep server adapters and document handlers out of browser entry points.

## Components and icons

```bash
bun add @gambrel/components @gambrel/icons
```

Load the stylesheet exported by `@gambrel/components/styles.css` once in your application.

Use named icon imports for known icons:

```tsx
/** @jsxImportSource @gambrel/view */
import { Button } from '@gambrel/components'
import { Plus } from '@gambrel/icons'

export function AddButton() {
  return (
    <Button>
      <Plus size={16} />
      Add item
    </Button>
  )
}
```

## Package format

Published packages contain:

- Built ESM JavaScript
- TypeScript declarations
- Explicit public exports
- A package-specific README
- A license file
- Stylesheets where the package provides them

Do not depend on unpublished source paths such as `@gambrel/components/src/...`. Import from the documented package entry points.

## Version selection

Use a consistent Gambrel release across packages in the same application.

For reproducible installations, commit your lockfile and use the package manager's frozen-lockfile mode in deployment automation.

## Runtime boundaries

| Import                                                    | Where it belongs                   |
| --------------------------------------------------------- | ---------------------------------- |
| `@gambrel/core`, `@gambrel/bun`, `@gambrel/ssr`           | Server application                 |
| `@gambrel/compiler`                                       | Build scripts                      |
| `@gambrel/browser`                                        | Browser entry                      |
| `@gambrel/view`, `@gambrel/router`, `@gambrel/reactivity` | Appropriate shared or runtime code |
| `@gambrel/components`, `@gambrel/icons`                   | Components                         |

A package's availability does not mean every export should run in every environment.

## License

Read the [license](./license.md) before adoption, modification, redistribution or application deployment.

## Related

- [Getting started](./getting-started.md)
- [Server–client boundary](./server-client-boundary.md)
- [Configuration](./configuration.md)
- [Components](./components.md)