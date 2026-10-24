# addons-ui

The Vite app that renders add-on screens in a frame inside Studio, part of the addons-project template.

- `src/AddonFrame.tsx` reads the installed add-ons' screens from `.pikku/screens/pikku-installed-addons.gen`, matches the requested path to a screen, and renders it with a Pikku client. It reads the parent Studio origin from the `parent` query parameter.
- `vite.config.ts` writes `src/sources.gen.css` so Tailwind scans `@pikkustudio/blocks` and the add-on packages, and proxies `/rpc`, `/content`, `/upload` and `/api` to `VITE_API_PROXY` (default `http://localhost:4003`).
- It allows framing by any origin (`frame-ancestors *`); access is controlled by the signed frame token checked on the project's backend.
- `bun run dev` starts `vite dev`; in normal use Studio starts it.
