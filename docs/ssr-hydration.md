# SSR and hydration

Gambrel renders every page to complete HTML on the server. The browser then **hydrates** it: it keeps that HTML and attaches behavior, instead of throwing it away and rebuilding.

## The idea

1. The server runs your guards and loaders and renders the page.
2. It sends the HTML plus a small block of JSON with the data it used.
3. The browser rebuilds the **same component tree** from that JSON.
4. It walks the tree and the existing DOM together, reusing every node that matches and attaching event handlers and live updates.

Because both sides build the tree from the same data, the first render in the browser matches the HTML. Nothing flashes, and the user can read the page before any JavaScript arrives.

## What the server sends

For `GET /users/1` the document ends like this (formatted for reading):

```html
  <main>...</main>
  <script type="application/json" id="gambrel-data" data-gambrel="payload">
    {"version":1,"routeId":"page:/users/[id]","pathname":"/users/1","params":{"id":"1"},
     "chain":[
       {"id":"layout:/","kind":"layout","data":null},
       {"id":"layout:/users","kind":"layout","data":{"total":3}},
       {"id":"page:/users/[id]","kind":"page","data":{"id":"1","name":"Ada Lovelace"}}
     ]}
  </script>
  <script type="module" src="/assets/client.js" data-gambrel="entry"></script>
</body>
```

| Field      | Meaning                                                                                |
| ---------- | -------------------------------------------------------------------------------------- |
| `version`  | The payload format. The browser rejects versions it does not know.                     |
| `routeId`  | The matched route.                                                                     |
| `pathname` | The path the server rendered.                                                          |
| `params`   | The decoded route params.                                                              |
| `chain`    | One entry per layout and the page, outermost first, each with its **own** loader data. |

Both scripts carry `data-gambrel`. Hydration skips them, so they never count as mismatches.

## Why the data is safe to embed

The payload is serialized with `<`, `>`, `&`, U+2028 and U+2029 written as `\u003c` and so on. The text can therefore never contain `</script>` or an HTML comment, whatever the data holds. Loader data must also be plain JSON; anything else fails the request before it is sent. See [Security](./security.md).

## What the browser does

`hydrateRoutes` in `src/client.ts`:

1. Finds `#gambrel-data` and parses it. Unknown fields, wrong types and unsupported versions are errors.
2. Compares it with the client's own route table: same path, same route, same params, same layout chain.
3. Rebuilds the tree with the components from the client manifest and the payload's params and data.
4. Hydrates the document.

**Loaders and guards never run in the browser.** The browser has no access to them: they live in `*.server.ts` files that the client build refuses to include.

If step 1 or 2 fails, nothing is changed: the server HTML stays as it is, readable but not interactive, and the error is thrown to your code.

## When markup does not match

The browser compares tree and DOM node by node. A difference is reported and repaired locally, never by rebuilding the whole page:

```text
[gambrel] hydration mismatch at "html > body > main > p": expected <p> but found <div>
```

| Difference          | Repair                     |
| ------------------- | -------------------------- |
| Different element   | That subtree is replaced   |
| Different text      | The text node is corrected |
| Missing node        | Created                    |
| Extra server node   | Removed                    |
| Different attribute | Set to the client's value  |

Mismatches almost always come from rendering something that differs between server and browser: the current time, random numbers, or `window`. Compute such values in a loader and pass them as data. See [Interactivity](./interactivity.md).

## Pages that are not hydrated

Redirects, 400, 403, 404, 405 and 500 responses carry no payload and no scripts. They are plain documents, so an error page is never mistaken for a page.

## Layout contract

- The root layout renders the whole document: `<html>`, `<head>` and `<body>`.
- The scripts are inserted before `</body>`, so the root layout must render a `<body>`.
- `<!doctype html>` is added automatically when the layout does not render one.

## Related

- [Routing and layouts](./routing.md): how the chain is built.
- [@gambrel/ssr](./ssr.md): the handler and its options.
- [@gambrel/browser](./browser.md): `hydrateRoutes` and the mismatch policy.