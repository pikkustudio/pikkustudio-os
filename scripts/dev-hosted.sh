#!/bin/bash
# Runs the web edition of Studio (cloud.pikkustudio.app) with Vite dev/HMR on http://localhost:4741, the cloud and web
# addons linked, VITE_STUDIO_LOCAL=false. The browser talks to the dev server only; Vite forwards the API paths to the
# real API with the session cookie rewritten to localhost (see hostedProxy in apps/studio/vite.config.ts), so you sign
# in on localhost yourself. Needs packages/pikkustudio-private checked out. The link state and pikku-addons.lock are put
# back as they were on exit.
#
#   PIKKUSTUDIO_API_URL  the API to forward to (default https://api.pikkustudio.app)
#   PORT                 the dev server's port (default 4741)
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
api=${PIKKUSTUDIO_API_URL:-https://api.pikkustudio.app}
port=${PORT:-4741}

[ -f packages/pikkustudio-private/packages/addon-web/package.json ] || { echo "packages/pikkustudio-private is not checked out; the web edition needs it" >&2; exit 1; }

saved=$(mktemp -d)
[ -f .studio-addons/addons.json ] && cp .studio-addons/addons.json "$saved/addons.json"
cp pikku-addons.lock "$saved/pikku-addons.lock"
restore() {
  cd "$root"
  if [ -f "$saved/addons.json" ]; then node scripts/link-addon.mjs --restore "$saved/addons.json"; else node scripts/link-addon.mjs --unlink; fi
  cp "$saved/pikku-addons.lock" pikku-addons.lock
  rm -rf "$saved"
}
trap restore EXIT

# TanStack Start tells its dev server middleware apart with `instanceof` against ITS copy of vite; bun installs a second
# copy beside apps/studio's, so the middleware is silently skipped and every page is a 404. Point it at the app's copy.
tss=node_modules/@tanstack/start-plugin-core/node_modules/vite
if [ -d "$tss" ] && [ ! -L "$tss" ] && [ -d apps/studio/node_modules/vite ]; then
  rm -rf "$tss" && ln -s ../../../../apps/studio/node_modules/vite "$tss"
fi

node scripts/link-addon.mjs
bun run prebuild
cd apps/studio
VITE_STUDIO_LOCAL=false VITE_API_URL="http://localhost:$port" VITE_API_PROXY="$api" bunx vite dev --port "$port" --strictPort
