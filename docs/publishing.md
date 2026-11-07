# Publishing to npm

The Gambrel packages are published to npm as built JavaScript with type declarations, not as TypeScript source. A small release tool in `tools/release` builds, checks and publishes them.

## Before the first release

1. An npm account, and the organization `gambrel` (https://www.npmjs.com/org/create) so that you own the `@gambrel` scope.
2. Be logged in: `npm login`, or an access token in the `NPM_CONFIG_TOKEN` variable or in `~/.npmrc`.
3. Run `bun run release doctor`. It checks your setup and says what is missing.

> [!NOTE]
> The packages are licensed under PolyForm Strict 1.0.0 (noncommercial use only, no distribution, no modification). Publishing on npm does not change that, but it means npm users cannot use them commercially. Decide that deliberately.

## Publish from the terminal

```bash
bun run release publish
```

This checks the manifests, runs the type check and the tests, builds every package, verifies the built packages against each other, lists the contents of each tarball, and then asks you to type `yes`. Nothing is published until you do. Useful options:

| Option         | Meaning                                                                |
| -------------- | ---------------------------------------------------------------------- |
| `--yes`        | Publish without the question                                           |
| `--tag next`   | Publish under a tag other than `latest`                                |
| `--otp 123456` | A six-digit code from an authenticator app. Not needed with a passkey. |
| `--skip-tests` | Skip the typecheck and test run                                        |
| `--client npm` | Publish with npm instead of Bun                                        |

Versions already on the registry are skipped, so an interrupted release can be resumed by running the command again.

To change the version first: `bun run release version 0.2.0`, then commit.

## Publish from GitHub

Add an Actions secret `NPM_TOKEN`, then push a tag that matches the version:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The workflow in `.github/workflows/publish.yml` runs the same steps on a clean machine. You can also run it from the Actions tab; manual runs are dry runs unless you untick the box. Provenance is available for public repositories: set the repository variable `NPM_PROVENANCE` to `true`.

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

## Verify packed packages outside the workspace

Before publishing, verify the real package tarballs in a fresh temporary consumer:

```bash
bun run release build
bun run release verify
bun run release:consumer
```

The consumer command packs every staged package, installs the tarballs outside the repository, checks local JavaScript resolution, runs a strict TypeScript check, exercises SSR and HTTP primitives, and bundles a browser entry.

Gambrel dependencies are pinned to the local tarballs, including transitive dependencies. The check does not publish anything or modify npm credentials.

TypeScript and Bun type packages are installed using the root project's configured versions. Network access may be needed.

Successful temporary consumers are deleted. Use `--keep` to retain one:

```bash
bun run release:consumer --keep
```

Failures preserve the directory and print its location for diagnosis.

This is not a replacement for real-browser verification or a complete consumer application.