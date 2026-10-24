# @pikkustudio/design-server

A small Vite-served web app for design work: it shows a project's design scratchpads and artifacts (pages, docs, designs) from a workspace folder.

- Start it with the `pikku-design-server` binary (`start.mjs`) or import `startDesignServer({ root, port, base })`, which resolves with the URL it serves on and a `close()`.
- `--root` (or `PIKKU_DESIGN_ROOT`) is the workspace to show, `--port` sets `PIKKU_DESIGN_PORT`, and `--base` sets `PIKKU_DESIGN_BASE`.
- The UI is in `src/` (React, with `artifact/`, `shell/` and `views/`); `seed-scratchpads/` holds the sample scratchpad it starts with.
- Messages are compiled with Paraglide: `bun run i18n:compile`. `bun run dev` compiles and starts the server; `bun run tsc` type-checks.
