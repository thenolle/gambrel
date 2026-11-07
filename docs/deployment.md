# Deployment

A production build produces two bundles you can deploy anywhere Bun runs.

## Build

```bash
bun run build
```

This writes, inside the app directory:

```text
dist/
├── client/client.js (+ client.js.map)   served at /assets/client.js
├── server/index.js (+ index.js.map)     the server
└── manifest/build.json, routes.json     what was built
```

The server bundle contains all of its dependencies, so you deploy the `dist` folder and nothing else. No `node_modules`, no TypeScript sources.

## Run

```bash
NODE_ENV=production PORT=3000 bun dist/server/index.js
```

The server looks for the browser assets in `dist/client` relative to the working directory. Run it from the folder that contains `dist`, or point at the folder:

```bash
GAMBREL_CLIENT_DIR=/srv/app/dist/client bun /srv/app/dist/server/index.js
```

## Checklist

- [ ] `NODE_ENV=production` is set, so error details stay on the server.
- [ ] `PORT` is set to what your platform expects.
- [ ] `/assets/client.js` returns `200` with a JavaScript content type.
- [ ] A missing asset returns a plain `404`, not an HTML page.
- [ ] Logs are collected from standard output and standard error.

## A container (example)

This file is a starting point and is not tested in this repository.

```dockerfile title="Dockerfile"
FROM oven/bun:1
WORKDIR /app
COPY dist ./dist
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
CMD ["bun", "dist/server/index.js"]
```

Build the app first, then build the image from the folder that contains `dist`.

## Behind a proxy

Gambrel does not compress responses or terminate TLS, and it sets no security headers. Do these at your reverse proxy or platform. If you want headers from the application, add a core middleware:

```ts title="src/app.ts"
app.use(async (ctx, next) => {
  const response = await next()
  response.headers.set('x-content-type-options', 'nosniff')
  return response
})
```

## Caching

Static assets are served with `cache-control: no-cache`, so browsers revalidate. Documents carry no cache headers. If you place a CDN in front, configure its rules explicitly.

## Hosting the documentation site

The documentation in this repository is a static site:

```bash
bun run docs:build
```

It writes `website/dist`, a folder of plain files that any static host can serve. The pages use relative URLs and hash routes, so the site works from a sub-path and needs no rewrite rules.

### GitHub Pages

The workflow in `.github/workflows/docs.yml` builds the site and deploys it whenever `docs/` or `website/` changes on `master`.

1. In the repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to **GitHub Actions**.
3. Push to `master`, or run the workflow from the Actions tab.

The site appears at `https://thenolle.github.io/gambrel/`. GitHub Pages is free for public repositories; private repositories need a paid GitHub plan.