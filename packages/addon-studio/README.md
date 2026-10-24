# @pikkustudio/addon-studio

The local backend behind Studio, packaged as a Pikku addon (`studio:*` RPCs). It is wired into the app by `packages/functions/src/addons/studio.addon.ts`.

- `src/services/` holds the work: projects and their git worktrees, one dev server per project, the builder chat, mock backend status, logs and metrics, publishing, settings and AI choice.
- `src/functions/` exposes those as Pikku functions; `src/services.ts` builds the service set.
- Other packages import `@pikkustudio/addon-studio/services` (for example `studioHome`), `/sources` and `/contributors`.
- The package is consumed from `dist/`: `bun run build` runs `pikku all` and `tsc`, and the root `scripts/build-libs.mjs` builds it before the app.
- `bun run tsc` type-checks; `bun run test` runs the tests in `test/`.
