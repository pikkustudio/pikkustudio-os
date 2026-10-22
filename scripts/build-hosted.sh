#!/bin/bash
# Builds the web edition of Studio (cloud.pikkustudio.app) into apps/studio/dist/client: the os frontend with the cloud
# and web addons linked, VITE_STUDIO_LOCAL=false and the API at controlplane. apps/studio/wrangler.hosted.jsonc serves
# that folder; deploying it is a separate step (`cd apps/studio && bunx wrangler deploy -c wrangler.hosted.jsonc`).
#
# Needs packages/pikkustudio-private checked out. The link state (.studio-addons) and pikku-addons.lock are put back as
# they were afterwards, whatever happens; the generated files stay the web edition's until the next prebuild.
#
#   PIKKUSTUDIO_API_URL  the API the build calls (default https://api.pikkustudio.app)
set -euo pipefail
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
api=${PIKKUSTUDIO_API_URL:-https://api.pikkustudio.app}

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

node scripts/link-addon.mjs
bun run prebuild
(cd apps/studio && VITE_STUDIO_LOCAL=false VITE_API_URL="$api" bunx --bun vite build)

# Hashed assets never change under their name; the Worker's static assets honour _headers.
cat > apps/studio/dist/client/_headers <<'EOF'
/assets/*
  Cache-Control: public, max-age=31536000, immutable
EOF
echo "Web edition built into apps/studio/dist/client (API $api)"
