# Publishing to npm

The Gambrel packages are published to npm as built JavaScript with type declarations, not as TypeScript source. A small release tool in `tools/release` builds, checks and publishes them.

## Before the first release

- **An npm account** that owns the `@gambrel` scope. Create an organization named `gambrel` on npmjs.com, or change the scope in every package. Check that the name is free with `npm view @gambrel/core`.
- **Login.** Run `npm login`, or provide an automation token in `.npmrc`.
- **The license.** The packages are licensed under PolyForm Strict 1.0.0: noncommercial use only, no distribution, no modification. Publishing on npm does not change this, but it means npm users cannot use the packages commercially. That is a decision to make deliberately.

## The release steps

```bash
bun run release plan            # list the packages in publish order
bun run release version 0.1.0   # set one version for every package
bun run release check           # validate manifests, then run typecheck and tests
bun run release build           # build every package into .release/
bun run release verify          # check the built packages and import each entry point
bun run release publish         # check, build, verify, then a dry run
bun run release publish --yes   # publish for real
```

`publish` always runs the checks, the build and the verification first, and it is a **dry run** unless you add `--yes`. Versions already on the registry are skipped, so an interrupted release can be resumed. Useful flags: `--tag next` for a prerelease tag, `--otp <code>` for two-factor authentication, and `--skip-tests` to skip the test run.

## What is published

Each package is built into `.release/<name>`:

| File                   | Contents                                                                          |
| ---------------------- | --------------------------------------------------------------------------------- |
| `dist/*.js`            | ESM bundles. Imports of other packages stay external.                             |
| `dist/*.d.ts`          | Type declarations                                                                 |
| `dist/styles.css`      | The components stylesheet (components only)                                       |
| `package.json`         | Rewritten for npm: built `exports`, real dependency versions, repository metadata |
| `README.md`, `LICENSE` | Generated README and the license                                                  |

All packages share one version, and dependencies between them use a caret range of that version.

## Using the published packages

```bash
bun add @gambrel/core @gambrel/bun @gambrel/view @gambrel/router @gambrel/ssr @gambrel/browser @gambrel/compiler
```

Gambrel runs on Bun. Configure TSX with `"jsx": "react-jsx"` and `"jsxImportSource": "@gambrel/view"`.

## Limitations

- The smoke test imports each built package against the workspace copies of its dependencies, not against the published ones.
- There is no provenance attestation, changelog generation or automatic git tagging. Tag the release in git yourself.
- A release is all-or-nothing in order: if one package fails to publish, the tool stops before the next. Fix the problem and run it again.