#!/bin/bash
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) target=darwin-arm64 ;;
  Darwin-x86_64) target=darwin-x64 ;;
  Linux-aarch64) target=linux-arm64 ;;
  Linux-x86_64) target=linux-x64 ;;
  *) echo "no desktop build for $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac
bundles=${TAURI_BUNDLES:-}
[ -n "$bundles" ] || { [ "$(uname -s)" = Darwin ] && bundles=app || bundles=all; }
[ -x ".deploy/uv/$target/bin/uv" ] || sh scripts/fetch-uv.sh "${target/-//}"
[ -x ".deploy/git/$target/bin/git" ] || sh scripts/fetch-git.sh "${target/-//}"
bun run prebuild
(cd apps/studio && bun run build)
bun scripts/build-runtime.ts
bunx --bun pikku deploy apply --provider standalone --runtime bun $(node scripts/pikku-config.mjs)
cd apps/studio
bun run tauri build --bundles "$bundles"
