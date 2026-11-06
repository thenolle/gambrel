# Guards and redirects

A guard decides whether a request may continue. It runs **before any loader**, so a request that is turned away does no data work at all.

## A first guard

Export `beforeLoad` from a `page.server.ts` or `layout.server.ts`:

```ts title="src/routes/admin/page.server.ts"
import type { Context } from '@gambrel/core'
import { redirect, type Guard, type ParamsOf } from '@gambrel/router'

export const beforeLoad: Guard<ParamsOf<'/admin'>, Context> = (ctx) => {
  if (ctx.context.request.headers.get('x-demo-user') === null) return redirect('/')
  return undefined
}
```

A guard returns nothing to let the request continue, or an outcome to stop it.

## The outcomes

| Helper                        | Effect                                                        | Default                          |
| ----------------------------- | ------------------------------------------------------------- | -------------------------------- |
| `redirect(location, status?)` | Redirect response with a `location` header and no body        | 302 (also 301, 303, 307, 308)    |
| `deny(status?, message?)`     | Error page with that status; the message is shown on the page | 403, any integer from 400 to 599 |
| `notFound()`                  | The 404 page                                                  | n/a                              |

```ts
if (!allowed) return deny(403, 'Members only')
```

Returning anything else (for example `true`) is a programming error and produces a 500 that names the guard.

> [!NOTE]
> `@gambrel/core` also exports a `redirect`. Core's returns a `Response` for API handlers. The router's returns an outcome for guards and loaders. Import each from its own package.

## Protect a whole section

A guard on a layout covers every page below it:

```ts title="src/routes/account/layout.server.ts"
import type { Context } from '@gambrel/core'
import { redirect, type Guard, type ParamsOf } from '@gambrel/router'

export const beforeLoad: Guard<ParamsOf<'/account'>, Context> = (ctx) =>
  ctx.context.request.headers.get('x-demo-user') === null ? redirect('/login') : undefined
```

Guards run from the outermost layout to the page, so a layout guard always runs before the guards of the pages inside it.

## Try it

```bash
curl -i http://localhost:3000/admin
curl -i -H 'x-demo-user: ada' http://localhost:3000/admin
```

The first answers `302` with `location: /`. The second renders the page.

> [!WARNING]
> Guards protect **documents** only. API routes registered with `app.get(...)` do not run guards. Check authentication inside those handlers, or in a core middleware.

## Redirects are not hydrated

A redirect, a denial or a 404 is a different kind of response from a page: it has no hydration payload and no scripts. The browser follows the redirect and hydrates the page it lands on.

## Related

- [Loaders](./loaders.md) can return the same outcomes.
- [Errors and 404 pages](./error-pages.md) shows how denied requests are rendered.
- [Router](./router.md) lists the exact order of guards and loaders.