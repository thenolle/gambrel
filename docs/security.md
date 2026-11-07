# Security

This page lists what Gambrel protects by design, and what remains your responsibility. It describes the current code; it is not a guarantee.

## Protected by the framework

| Area                             | What happens                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| HTML text                        | Escaped (`&`, `<`, `>`) by default                                                                      |
| Attribute values                 | Escaped (`&`, `<`, `>`, `"`, `'`) and always double-quoted                                              |
| Element and attribute names      | Validated, so spread props cannot inject markup                                                         |
| Event props                      | Never written to HTML, in any casing. A string `onclick="..."` is dropped.                              |
| `<script>` and `<style>` content | Must go through `raw()`. A plain string child throws.                                                   |
| Hydration data                   | JSON only, written with `<`, `>`, `&`, U+2028 and U+2029 escaped, so it cannot close its `<script>` tag |
| Payload in the browser           | Treated as untrusted: strict shape checks, then compared with the page's URL, route and layout chain    |
| Server code                      | The browser build fails if its imports reach a `*.server.ts` file or a server-only package              |
| Static files                     | Paths that escape the directory, directories, and null bytes give a plain `404`                         |
| Error details                    | Stack traces and messages appear only in development; errors are always logged                          |
| Dependencies                     | No third-party runtime dependencies. Development uses TypeScript, the Bun types and happy-dom.          |

## Your responsibility

> [!WARNING]
> **Loader data is public.** Everything a loader returns is written into the page source. Never return secrets, tokens, password hashes or whole database records. See [The server/client boundary](./server-client-boundary.md).

- **`raw()` is trusted.** Never pass user input to it.
- **URLs are not sanitized.** `<a href={userInput}>` with a `javascript:` URL runs when clicked. Validate URLs from users before rendering them.
- **Redirects.** `redirect(location)` sends the browser where you tell it. Do not build the location from unchecked user input, or you create an open redirect.
- **Guards cover documents only.** API routes added with `app.get(...)` do not run guards. Check authentication in those handlers or in a middleware.
- **No built-in authentication.** There are no sessions, cookies helpers or CSRF protection. The example's `x-demo-user` header is a demonstration, not a security mechanism.
- **No security headers.** Set `Content-Security-Policy`, `X-Content-Type-Options`, HSTS and the rest at your proxy or in a middleware. See [Deployment](./deployment.md).
- **No rate limiting, CORS handling or request size limits.** Provide them at the platform or in middleware.
- **Run with `NODE_ENV=production`.** Otherwise the server may show error details.

## Checking your own app

```bash
bun test                      # includes tests that hostile data cannot break out of the page
bun run build                 # fails if server code would reach the browser
```

View the source of a page and read the `gambrel-data` script: that is everything the browser receives from your loaders.

## Reporting a problem

If you find a vulnerability, contact the maintainer through GitHub ([@thenolle](https://github.com/thenolle)) rather than opening a public issue with exploit details.