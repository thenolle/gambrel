# Limitations and roadmap

Gambrel is a prototype that does a small number of things carefully. This page lists what it does not do, so you can decide early whether it fits.

## What is verified, and how

| Area                                         | Evidence                                                                                                                   |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Routing, resolution, rendering, build output | Automated tests (195 at the time of writing)                                                                               |
| Hydration                                    | Automated tests in happy-dom, with real server HTML. Real-browser checks are manual: see [Testing your app](./testing.md). |
| Platforms                                    | Developed and tested on Windows with Bun 1.4.4-canary.1. Linux and macOS are not tested.                                   |

## Current limitations

| Limitation                                | Detail                                                                                          |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Bun only                                  | No Node, Deno or edge runtime support.                                                          |
| No client-side navigation                 | Links are full page loads.                                                                      |
| No hot module replacement                 | `bun run dev` rebuilds the browser bundle; reload the page. New route files need a restart.     |
| One browser bundle                        | All route components ship together. There is no route-level code splitting.                     |
| Synchronous route components              | Pages and layouts cannot be `async`, because they also run in the browser.                      |
| No streaming and no Suspense              | A document is rendered completely before it is sent.                                            |
| Whole-region updates                      | A reactive region re-renders all of its content. There is no keyed list diffing.                |
| No SVG namespace                          | The browser runtime creates HTML elements only.                                                 |
| Page-level errors only                    | A failure while rendering gives a 500 for the whole page. There are no nested error boundaries. |
| Loaders run in sequence                   | They run one after another, on every request, with no built-in cache.                           |
| Minimal event types                       | Handlers receive a small structural `ViewEvent`; cast `currentTarget` for DOM members.          |
| Core answers no automatic HEAD or OPTIONS | For explicit routes. Page routes do answer HEAD.                                                |
| Trailing slashes are not canonicalized    | `/about/` and `/about` render the same page; neither redirects.                                 |
| No request helpers                        | No cookie, session, body-parsing, CORS or form helpers. Use the standard `Request` API.         |

## Not goals

Gambrel will not grow into a database layer, an authentication product, a CSS framework, a form library, a remote data cache, a multi-runtime layer or a plugin marketplace. These are better provided by libraries you choose.

## Possible future work

These are ideas, not promises, and not scheduled.

- Client-side navigation using the existing payload and route table
- Route-level code splitting
- Keyed list reconciliation
- Streaming responses
- A development server with hot reloading
- Publishable packages with built output

See [Security](./security.md) for what the framework does and does not protect.