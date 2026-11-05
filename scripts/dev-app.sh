#!/bin/bash
# Runs the app edition of Studio (the one the desktop build ships) with Vite dev/HMR on http://localhost:4741 and the
# local backend (pikku dev) on http://localhost:4740, with the cloud addon linked but not the website's pages
# (link-addon.mjs --app). The backend calls the cloud API, and you sign in the way the app does, through cli-auth
# (device sign-in). The link state and pikku-addons.lock are put back as they were on exit.
#
#   PIKKUSTUDIO_API_URL  the cloud API the backend talks to (default https://api.pikkustudio.app)
#   PORT                 the Vite dev server's port (default 4741)
#   API_PORT             the local backend's port (default 4740)
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
export PIKKUSTUDIO_API_URL=${PIKKUSTUDIO_API_URL:-https://api.pikkustudio.app}
port=${PORT:-4741}
api_port=${API_PORT:-4740}

[ -f packages/pikkustudio-private/packages/addon-cloud/package.json ] || { echo "packages/pikkustudio-private is not checked out; the app's cloud sign-in needs it" >&2; exit 1; }

saved=$(mktemp -d)
backend=
[ -f .studio-addons/addons.json ] && cp .studio-addons/addons.json "$saved/addons.json"
cp pikku-addons.lock "$saved/pikku-addons.lock"
restore() {
  [ -n "$backend" ] && kill "$backend" 2>/dev/null || true
  cd "$root"
  if [ -f "$saved/addons.json" ]; then node scripts/link-addon.mjs --restore "$saved/addons.json"; else node scripts/link-addon.mjs --unlink; fi
  cp "$saved/pikku-addons.lock" pikku-addons.lock
  rm -rf "$saved"
}
trap restore EXIT INT TERM

# See dev-hosted.sh: TanStack Start's dev middleware needs the app's copy of vite.
tss=node_modules/@tanstack/start-plugin-core/node_modules/vite
if [ -d "$tss" ] && [ ! -L "$tss" ] && [ -d apps/studio/node_modules/vite ]; then
  rm -rf "$tss" && ln -s ../../../../apps/studio/node_modules/vite "$tss"
fi

node scripts/link-addon.mjs --app
bun run prebuild

bunx --bun pikku dev --port "$api_port" $(node scripts/pikku-config.mjs) &
backend=$!

cd apps/studio
VITE_API_PROXY="http://localhost:$api_port" bunx vite dev --port "$port" --strictPort
