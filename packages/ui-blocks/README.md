# @pikkustudio/blocks

The shared UI of Studio: screens, blocks, layouts and primitives that the app (`apps/studio`) composes. The directory is `packages/ui-blocks`; the npm name stays `@pikkustudio/blocks`.

- `src/screens`, `src/blocks`, `src/layouts`, `src/ui`, `src/changes-panel`, plus `src/lib` (hooks and helpers), `src/types` and `src/styles`. Each is exported as a subpath (for example `@pikkustudio/blocks/screens/LogsScreen`).
- It has no API client of its own: it imports the generated client of the app that uses it (`@project/functions-sdk/pikku/api.gen`) and the app's compiled Paraglide messages. See `docs/os-sdk-contract.md`.
- `messages/` holds its locale files (en, de, ar); they are compiled together with the app's.
- It must not name the cloud product: `scripts/check-cloud-boundary.mjs` checks this.
- `bun run test` runs `bun test src`; `bun run tsc:i18n` checks the message keys.
