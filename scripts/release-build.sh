#!/bin/sh
set -eu
[ $# -gt 0 ] || { echo "usage: release-build.sh <os>/<arch>..." >&2; exit 1; }
version=${RELEASE_VERSION:?RELEASE_VERSION is not set}
name=${RELEASE_NAME:-studio-os}
root=$(cd "$(dirname "$0")/.." && pwd)
out=$(mkdir -p "${RELEASE_OUT:-$root/dist-release}" && cd "${RELEASE_OUT:-$root/dist-release}" && pwd)
cd "$root"
host=$(uname -s | tr A-Z a-z)-$(uname -m | sed -e 's/x86_64/x64/' -e 's/aarch64/arm64/')
bun run prebuild
(cd apps/studio && bun run build)
for platform in "$@"; do
  target=$(echo "$platform" | tr / -)
  echo "[release] $name $version for $target"
  scripts/fetch-uv.sh "$platform"
  scripts/fetch-git.sh "$platform"
  PIKKU_COMPILE_TARGET="bun-$target" bun scripts/build-runtime.ts
  rm -rf .deploy/standalone
  PIKKU_COMPILE_TARGET="bun-$target" bunx --bun pikku deploy apply -p standalone --runtime bun $(node scripts/pikku-config.mjs)
  dist=$(ls -d .deploy/standalone/*-dist | head -1)
  unit=$(basename "$dist" -dist)
  stage=$(mktemp -d)
  mkdir -p "$stage/$name"
  cp -R "$dist/." "$stage/$name/"
  echo "$version" > "$stage/$name/VERSION"
  chmod +x "$stage/$name/$unit"
  file="$out/$name-$version-$target.tar.gz"
  COPYFILE_DISABLE=1 tar czf "$file" -C "$stage" "$name"
  if [ "$target" != "$host" ]; then
    rm -rf "$stage"
    echo "[release] $target cannot run on this $host host, skipping the boot check"
    continue
  fi
  home=$(mktemp -d)
  port=${RELEASE_SMOKE_PORT:-4740}
  (cd "$stage/$name" && PIKKU_STUDIO_HOME="$home" "./$unit" db migrate >/dev/null)
  (cd "$stage/$name" && exec env PORT="$port" PIKKU_STUDIO_HOME="$home" \
    BETTER_AUTH_SECRET=release-check-not-a-real-secret-0123456789 "./$unit") > "$home/studio.log" 2>&1 &
  pid=$!
  ok=0
  curl -fsS --retry 60 --retry-delay 1 --retry-all-errors -o /dev/null "http://localhost:$port/studio/health" && ok=1
  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  if [ "$ok" != 1 ]; then
    cat "$home/studio.log"
    exit 1
  fi
  rm -rf "$home" "$stage"
  echo "[release] $target boots"
done
ls -l "$out"
