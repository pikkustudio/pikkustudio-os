# addons-project (template)

The Pikku project that hosts Studio's add-ons. It is a template, not a workspace package.

- `packages/functions/src/lib/addons-project.ts` copies it to `<studio home>/addons` on first use, runs `git init` there and registers it as the project `addons`. On later runs it re-syncs only the framework paths (`src/lib`, `src/middleware`, `src/services.ts`, `src/config.ts`, `src/auth.ts`, `apps/addons-ui/src`) and commits the change.
- `src/addons/*.addon.ts` lists the installed add-ons (`spindle`, wired with `ui: true`); `src/lib/frame-token.ts` verifies the signed token Studio gives an add-on's screen frame; `src/lib/addon-reach.ts` stops an add-on calling RPCs of add-ons it does not list in `uses`.
- `apps/addons-ui` is the Vite app that renders add-on screens inside Studio.
- `node_modules` is linked to the Studio checkout's, so dependencies come from the root install.
