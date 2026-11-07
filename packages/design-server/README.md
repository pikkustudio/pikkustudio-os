# @pikkustudio/design-server

A small Vite-served web app for design work: it shows a project's design scratchpads and artifacts (pages, docs, designs) from a workspace folder.

- Start it with the `pikku-design-server` binary (`start.mjs`) or import `startDesignServer({ root, port, base })`, which resolves with the URL it serves on and a `close()`.
- `--root` (or `PIKKU_DESIGN_ROOT`) is the workspace to show, `--port` sets `PIKKU_DESIGN_PORT`, and `--base` sets `PIKKU_DESIGN_BASE`.
- The UI is in `src/` (React, with `artifact/`, `shell/` and `views/`); `seed-scratchpads/` holds the sample scratchpad it starts with.
- Messages are compiled with Paraglide: `bun run i18n:compile`. `bun run dev` compiles and starts the server; `bun run tsc` type-checks.

## Runs in place

Studio starts this server straight from the shared install (`start.mjs` where the package lives), once per open project with `--root <project worktree>`; it does not copy the package per project. That is safe because the server writes nothing itself: Vite's cache goes to `tmpdir()/pikku-design-server/<hash of root>`, the config is loaded in-memory (no `vite.config.ts.timestamp-*` files), and all state (scratchpads, artifacts) lives in the project worktree. In Studio's sandbox the package and its `node_modules` are read-only and only the project worktree and tmpdir are writable.
