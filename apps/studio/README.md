# @pikkustudio/app-studio

The Studio web app: a TanStack Start (React, Vite) front end that is also the desktop shell (Tauri, `src-tauri/`).

- Screens and routes live in `src/`; most shared screens and blocks come from `@pikkustudio/blocks` (`packages/ui-blocks`), and add-on screens are mounted through `src/addon-ui`.
- It talks to the backend in `packages/functions` through the generated client in `packages/functions-sdk`. In dev the API is proxied from `VITE_API_PROXY` (default `http://localhost:4740`).
- `bun run dev` serves on port 4741 (`vite dev`). From the repo root, `bun run dev` runs this script.
- `bun run build` builds the app and then the injected preview panel (`vite.injected.config.ts` bundles `src/injected/panel.tsx` to `injected/panel.js`).
- `bun run tsc` type-checks; `bun run tauri` runs the Tauri CLI.
- `tools/` holds the hand-written Vite plugins that add test ids; `messages/` holds the app's own locale files (en, de, ar).
- Generated files (`*.gen.*`, `src/paraglide`) come from the root `prebuild` script; see `docs/building-releases.md` for how the app is packaged.
