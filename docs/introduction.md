# Gambrel

Gambrel is a TypeScript-first web framework for Bun, built around JSX components, explicit server data loading, and a small reactive browser runtime.

Use it to render documents on the server, hydrate existing HTML, or mount an interface entirely in the browser.

## Choose how your interface runs

| Mode               | Initial content               | Interaction                                   |
| ------------------ | ----------------------------- | --------------------------------------------- |
| SSR with hydration | Rendered HTML from the server | Browser attaches events and reactive behavior |
| CSR                | HTML shell                    | Browser mounts the interface and loads data   |
| Server-only HTML   | Rendered HTML from the server | Native forms and document navigation          |

The task-board examples demonstrate all three modes with the same application behavior.

## A route is a file

```text
src/routes/
├── layout.tsx
├── page.tsx
└── users/
    └── [id]/
        ├── page.tsx
        └── page.server.ts
```

Components live in `page.tsx` and `layout.tsx`. Server hooks live in separate `.server.ts` files.

## Data stays explicit

Guards run before loaders. Each layout and page receives its own loader data. Only plain JSON is transported to the browser.

The client manifest does not import server hooks.

## Interfaces without a CSS framework

Gambrel includes a component library with plain CSS and an SVG icon collection. Use the default theme or customize its CSS variables.

## Explore

- [Getting started](./getting-started.md)
- [Routing and layouts](./routing.md)
- [Server–client boundary](./server-client-boundary.md)
- [SSR and hydration](./ssr-hydration.md)
- [Components](./components.md)
- [Icons](./icons.md)

## License

Gambrel is distributed under PolyForm Strict License 1.0.0. Review the [license](./license.md) before using, modifying or distributing the software.