# Rendering examples

Gambrel includes a task-board application implemented in three rendering modes.

Each mode supports adding tasks, completing and reopening them, deleting them, and persisting them across server restarts.

## Run an example

From the repository root:

```bash
bun install
```

Then choose a mode:

```bash
bun run --filter @gambrel/example-modes ssr
```

```bash
bun run --filter @gambrel/example-modes csr
```

```bash
bun run --filter @gambrel/example-modes server
```

Each command builds the example before starting its server.

| Mode               | Default URL             |
| ------------------ | ----------------------- |
| SSR with hydration | `http://localhost:3101` |
| CSR                | `http://localhost:3102` |
| Server-only HTML   | `http://localhost:3103` |

## SSR with hydration

The server sends the saved tasks as complete HTML.

The browser validates the hydration payload and attaches events and reactive behavior to that HTML. Adding or changing tasks uses HTTP requests without a document navigation.

Before hydration, native forms remain usable.

To inspect the mode:

1. Add a task and reload.
2. View the page source: the task title is present.
3. Use the controls after the browser script loads.
4. Disable JavaScript and submit the native form.

## CSR

The server sends an HTML shell. The browser mounts the task board, requests its data, and renders the tasks.

The interface includes an initial loading state and displays request errors without discarding the previous task list.

To inspect the mode:

1. View page source: saved task titles are absent.
2. Observe the request to `/api/tasks`.
3. Add, complete and delete a task.
4. Disable JavaScript: the shell explains that this mode requires it.

## Server-only HTML

The server renders the task list and includes no browser application script.

Forms submit to server handlers, which perform mutations and redirect to the updated board.

This mode does not depend on hydration.

## Shared application structure

```text
examples/modes/
├── public/app.css
├── scripts/build.ts
└── src/
    ├── app.ts
    ├── client.tsx
    ├── form-submission.ts
    ├── manifests.ts
    ├── model.ts
    ├── server.ts
    ├── store.ts
    └── ui.tsx
```

The examples share UI and server behavior so the rendering-mode differences remain easy to compare.

The explicit manifest keeps this example focused on rendering. The separate `examples/app` application demonstrates filesystem route discovery.

## Persistence

Each mode uses a separate JSON file:

```text
examples/modes/.data/
├── ssr.json
├── csr.json
└── server.json
```

A file is created on its first successful write.

The store serializes operations inside one process. It is a single-user example, not a replacement for a transactional, multi-process database.

Do not run multiple servers against the same file.

## Browser form submissions

The enhanced submit handler snapshots form data before setting the pending state.

Disabled controls are not included in a form-data snapshot, so changing the UI first can accidentally remove values from the request.

Native and enhanced submissions share the same server validation.

## Configuration

`PORT` overrides the selected mode's default port.

`TASKS_FILE` overrides its data file. Relative paths are resolved against the process working directory.

## Tests

```bash
bun test examples/modes
```

The suite covers the rendering responses, task mutations, validation, persistence and browser-submission behavior.

## Related

- [Getting started](./getting-started.md)
- [SSR and hydration](./ssr-hydration.md)
- [Interactivity](./interactivity.md)
- [Application structure](./development.md)