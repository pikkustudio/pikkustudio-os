#!/bin/sh
# Boots a Linux release tarball the way a user would on a clean machine. Run it inside debian:stable-slim:
#   docker run --rm -v "$PWD/dist-release:/dist:ro" -v "$PWD/scripts:/scripts:ro" debian:stable-slim \
#     sh /scripts/release-check.sh /dist/studio-os-<version>-linux-arm64.tar.gz
# Fails unless `db migrate` applies the migrations and both /studio/health and / answer 200.
set -eu
tarball=${1:?usage: release-check.sh <tarball>}
port=${PORT:-4750}
if ! command -v curl >/dev/null; then
  apt-get update -qq >/dev/null
  apt-get install -y -qq --no-install-recommends curl ca-certificates >/dev/null
fi
work=$(mktemp -d)
tar xzf "$tarball" -C "$work"
dir=$(ls -d "$work"/*/ | head -1)
cd "$dir"
export PIKKU_STUDIO_HOME="$(mktemp -d)"
migrate=$(./os db migrate 2>&1) || { echo "$migrate"; echo "[check] db migrate failed" >&2; exit 1; }
echo "$migrate"
echo "$migrate" | grep -Eq 'Applied [0-9]+ migration\(s\)\.' || { echo "[check] db migrate did not report applied migrations" >&2; exit 1; }
PORT="$port" ./os > "$PIKKU_STUDIO_HOME/studio.log" 2>&1 &
pid=$!
status=0
for path in /studio/health /; do
  code=$(curl -sS --retry 60 --retry-delay 1 --retry-all-errors -o /dev/null -w '%{http_code}' "http://localhost:$port$path" || true)
  echo "[check] GET $path -> $code"
  [ "$code" = 200 ] || status=1
done
kill "$pid" 2>/dev/null || true
wait "$pid" 2>/dev/null || true
if [ "$status" != 0 ]; then
  cat "$PIKKU_STUDIO_HOME/studio.log"
  exit 1
fi
echo "[check] $(basename "$tarball") boots in $(. /etc/os-release && echo "$PRETTY_NAME")"
