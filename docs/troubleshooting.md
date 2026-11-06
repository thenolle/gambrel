# Troubleshooting

Find your symptom or error message below.

## Build and routes

| Message or symptom                                                            | Cause and fix                                                                                                                                                                          |
| ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Routes directory not found: '...'`                                           | The routes folder does not exist. Create `src/routes` or set `routesDir`.                                                                                                              |
| `unsupported route file`                                                      | A file is called `page.ts`, `page.jsx`, `page.server.tsx` and so on. Rename it to `page.tsx`, `layout.tsx`, `page.server.ts` or `layout.server.ts`.                                    |
| `resolve to the same URL`                                                     | Two pages map to one URL, often through a `(group)` folder or two different param names. Rename one.                                                                                   |
| `needs a 'page.tsx' in the same directory`                                    | A `*.server.ts` file has no component beside it.                                                                                                                                       |
| `Server-only module '...' is imported by '...' and would ship to the browser` | A `page.tsx`, `layout.tsx` or a component imports server code. Move it into a `*.server.ts` file, or use `import type`. See [The server/client boundary](./server-client-boundary.md). |
| `clientEntry not found: ...`                                                  | The path in `gambrel.config.ts` is wrong, or `src/client.ts` is missing.                                                                                                               |
| `outDir ... must not be the project root or contain it`                       | Choose a separate output folder such as `dist`.                                                                                                                                        |
| `Cannot find module '@gambrel/...'`                                           | Run `bun install`, and check that the package is listed in the root `workspaces`.                                                                                                      |
| An error mentioning `react/jsx-dev-runtime`                                   | Add `/** @jsxImportSource @gambrel/view */` at the top of the `.tsx` file.                                                                                                             |
| A new route returns 404 in development                                        | Restart `bun run dev` so the route manifests are regenerated.                                                                                                                          |

## Server

| Message or symptom                                                      | Cause and fix                                                                                           |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `The root layout must render a <body> element ...`                      | The hydration scripts are inserted before `</body>`. Make the root layout render `<html>` and `<body>`. |
| `No component registered for 'page:/...'`                               | The server was started with out-of-date manifests. Run `bun run generate`, or restart.                  |
| A 500 with `is undefined; JSON has no undefined`                        | A loader returned `undefined`. Return `null` for "no data".                                             |
| A 500 naming a path such as `.joined is not a plain object`             | A loader returned a `Date`, class instance or other non-JSON value. Convert it.                         |
| `Guard for '...' must return nothing, redirect(), deny() or notFound()` | A `beforeLoad` returned some other value.                                                               |
| `PORT must be an integer`                                               | Fix the `PORT` environment variable.                                                                    |
| `address already in use`                                                | Another process uses the port. Stop it or set `PORT`.                                                   |

## Browser

| Message or symptom                                                                     | Cause and fix                                                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The console says the module has a `disallowed MIME type ("text/html")` for `client.js` | The browser bundle was not built or is not being served. Run `bun run build`, and check `GAMBREL_CLIENT_DIR`. A missing asset must return a plain `404`, not a page.                     |
| Nothing is interactive but the page looks right                                        | The script failed to load or hydration threw. Open the browser console.                                                                                                                  |
| `Hydration payload element #gambrel-data not found`                                    | The page was not rendered by the Gambrel document handler, or it is an error page (which carries no payload).                                                                            |
| `Invalid hydration payload: payload is for '/a' but the page is '/b'`                  | The URL the browser sees differs from the one the server rendered, usually because a proxy rewrites paths.                                                                               |
| `[gambrel] hydration mismatch at "html > body > ...": expected <p> but found <div>`    | The browser tree differs from the server HTML. Look for values that change between renders, such as the time, random numbers or `window` reads. See [Interactivity](./interactivity.md). |
| `Async components cannot run in the browser`                                           | A page, layout or component is `async`. Load data in a loader and pass it as props.                                                                                                      |

## Tests

| Symptom                                     | Fix                                                                                             |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `Cannot find module '../.gambrel/...'`      | Run `generateRoutes` (or `bun run generate`) before importing the application or the manifests. |
| A hydration test fails with a mismatch list | The list names the path and the difference. It is the same output a browser would show.         |

## The documentation site

| Symptom                                | Fix                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| A blank page                           | Open it through `bun run docs` (or a static host), not as a `file://` URL. The site loads Markdown with `fetch`. |
| A page says "Could not load this page" | The file is missing or not listed in `docs/nav.json`.                                                            |

If something here is out of date, the tests in `examples/app/test` show the current behavior.