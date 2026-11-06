# SSR and hydration

## Request lifecycle (`@gambrel/ssr`)

`createDocumentHandler({ routes, components, hooks, entry?, development?, renderError? })` returns `{ handle(request, context) }`.

1. Only GET and HEAD are served; other methods get 405 with `Allow: GET, HEAD`.
2. `resolve` matches the route, runs guards (outer to inner), then loaders (outer to inner). `context` is passed to every hook.
3. `composeRoute` builds the tree: layouts nest outermost first, each entry gets `params` and its own `data`.
4. `renderToString` produces the HTML. `<!doctype html>` is prepended if the layout did not render one.
5. When `entry` is set, the payload script and the module entry script are inserted before `</body>`, both marked `data-gambrel`. The root layout must render a `<body>`, otherwise the response is a 500.

| Outcome                      | Response                                              |
| ---------------------------- | ----------------------------------------------------- |
| page                         | 200 HTML with payload and entry script                |
| redirect                     | its status, `location` header, no body                |
| denied                       | its status, error document                            |
| not found, unmatched path    | 404 error document                                    |
| malformed path encoding      | 400 error document                                    |
| thrown error or invalid data | 500 error document, error logged with `console.error` |

Error documents never contain the payload or scripts, so they are never hydrated. Error details and stack traces are shown only when `development` is true. `renderError(info)` replaces the default document.

## Hydration payload (version 1)

```text
{ version: 1, routeId, pathname, params, chain: [{ id, kind: 'layout' | 'page', data }] }
```

It is embedded as `<script type="application/json" id="gambrel-data" data-gambrel="payload">`. The JSON is written with `< > & U+2028 U+2029` as unicode escapes, so it cannot close the script element or open a comment. Loader data must be plain JSON (`assertJsonValue`); nothing else is serialized.

## Browser (`@gambrel/browser`)

`hydrateRoutes({ routes, components, document?, pathname?, onMismatch? })`:

1. Reads `#gambrel-data` and parses it with strict shape checks (unknown fields, wrong types and unsupported versions throw `HydrationPayloadError`).
2. Verifies it against the client route table: same pathname, route id, params and layout chain.
3. Rebuilds the tree with `composeRoute` from the payload's params and per-entry data.
4. Hydrates the document. Loaders and guards never run in the browser.

On a payload error nothing is changed: the server HTML stays as it is. Mismatches between markup and tree follow the repair policy in `docs/browser.md`. Nodes marked `data-gambrel` are skipped by hydration.

## Limitations

- No client-side navigation: links are full page loads.
- One client bundle (no route-level code splitting).
- Route components must be synchronous.