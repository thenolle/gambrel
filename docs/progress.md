# Progress

| Phase                    | Status                                 | Verification                                                                   |
| ------------------------ | -------------------------------------- | ------------------------------------------------------------------------------ |
| 1 Foundation             | Done                                   | `bun install`, `bun run typecheck` passed                                      |
| 2 Core and Bun adapter   | Done                                   | typecheck passed, 16 tests passed, example served over HTTP                    |
| 3 View                   | Typecheck passed; render tests pending | Render tests failed to resolve the JSX runtime until the test pragma was added |
| 4 Reactivity and browser | Written, not yet verified              | Run `bun install`, `bun run typecheck`, `bun test`                             |
| 5 to 10                  | Not started                            |                                                                                |