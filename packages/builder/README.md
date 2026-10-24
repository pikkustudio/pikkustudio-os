# @pikkustudio/builder

The Pikku builder: the `pi` coding agent (`@earendil-works/pi-coding-agent`) set up to build Pikku apps, with the Pikku skills and Studio's own edit tools.

- Terminal: the `pikku-builder` binary (`src/bin.ts`) writes the skills and then starts pi with the builder's arguments.
- Studio: `BuilderSession` (`src/session.ts`) runs pi as a child process and turns its output into conversation items, modes, specialists and questions that Studio shows. `@pikkustudio/addon-studio` drives it over RPC.
- `extensions/` holds the pi extensions it loads (file editing and writing, navigation, codegen diagnostics, parse checks, the Studio MCP bridge, and the proxy provider for proxied AI keys).
- `src/changes.ts` routes messages to the project's `pikku` changes queue.
- `bun run build` compiles to `dist/`; `bun run test` runs the tests; `bun run tsc` type-checks.
