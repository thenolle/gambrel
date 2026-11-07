# Compatibility

Use this page to check whether Gambrel's runtime and rendering model fit your application.

## Runtime and module format

- Server execution targets Bun.
- Packages use ESM.
- Components use Gambrel's JSX runtime.
- React component compatibility is not provided.

## Rendering

- Route components are synchronous.
- The standalone server renderer supports async components.
- Documents are rendered before they are sent; rendering is not streamed.
- Links perform document navigation.
- SSR, browser mounting, and server-only HTML are separate supported composition patterns.

## Browser updates

Signals drive function children and function-valued attributes.

Dynamic child regions replace their contents when updated. They do not provide keyed reconciliation. Keep this behavior in mind for large lists, focused inputs, and stateful children.

## Routing and data

- Layouts nest from the outside in.
- Guards run before loaders.
- Loaders run sequentially.
- Each matched entry has its own data.
- Loader data must be plain JSON.
- Cache policy and remote data invalidation belong to the application.

## UI components

Components document their individual state, focus, keyboard and styling contracts.

Popover positioning uses CSS and does not perform viewport collision detection. DataTable processes rows on the client. Combobox does not provide remote searching or virtualization.

## Application responsibilities

Gambrel does not provide authentication, authorization policy, database persistence, rate limiting or deployment infrastructure.

The example application's JSON store is a single-process demonstration, not a multi-user database.

## License

Review the [license](./license.md) before adoption, application distribution or commercial deployment.