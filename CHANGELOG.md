# Changelog

## 0.2.2

### Documentation

- Added package-specific public READMEs to published packages.
- Updated installation, architecture, application structure and build documentation.
- Documented SSR, CSR and server-only rendering examples.
- Clarified package entry points, stylesheet integration and compatibility.

### Release tooling

- Package README validation accepts Windows and Unix line endings and UTF-8 BOMs.
- Published README files are copied from their package sources.

## 0.2.0

### Added

- Expanded component library with linked fields, input groups, password inputs,
  search inputs, number inputs, file inputs and toggle groups.
- Application UI components: Command, Combobox, navigation and sidebar primitives,
  Toolbar, EmptyState, StatCard, DescriptionList, Stepper and DataTable.
- Additional icons across development, navigation, editing, communication, media,
  commerce, status and device categories.
- Gambrel brand icon.
- Static searchable icon catalog with category filters, preview controls and
  import, JSX and SVG copy actions.
- Configurable icon categories and search keywords.
- Isolated consumer verification using actual package tarballs.

### Fixed

- Nested overlay dismissal handles only the topmost registered layer.
- Controlled dialogs can decline dismissal requests.
- Native dialog failures are no longer silently replaced with non-modal behavior.
- Tooltip timers are cleaned up on disposal.
- Tooltip descriptions preserve existing accessible description IDs.
- Icon source validation rejects duplicate attributes, unsupported root
  attributes and negative dimensions.
- Gambrel icon source is separated from standalone website brand assets.

### Verification

- Installed-consumer verification exercises package installation, local built-JS
  resolution, strict TypeScript checking, runtime SSR, stylesheet resolution and
  browser bundling.
- Browser-native modal behavior and visual icon quality still require manual
  review.

### Limitations

- DataTable processing is client-side, without virtualization or keyed row updates.
- Combobox does not implement remote option loading or virtualization.
- Automatic publishing through the release wrapper is not confirmed working.
  Publishing directly from staged package directories is the demonstrated route.