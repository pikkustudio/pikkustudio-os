#!/bin/sh
set -eu
version=${1:?usage: publish-rea-bundles.sh <rea-version>}
root=$(cd "$(dirname "$0")/.." && pwd)
out=${REA_OUT:-$root/.deploy/rea/$version}
rm -rf "$out"
for platform in darwin-arm64 darwin-x64 linux-arm64 linux-x64; do
  "$root/scripts/build-rea-bundle.sh" "$platform" "$version" "$out" >&2
done
host=$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/;s/aarch64/arm64/')
smoke=$(mktemp -d)
trap 'rm -rf "$smoke"' EXIT
tar xzf "$out/rea-$version-$host.tar.gz" -C "$smoke"
[ "$("$smoke/rea-$version-$host/bin/rea" --version)" = "$version" ] || { echo "rea $host bundle does not report $version" >&2; exit 1; }
for f in "$out"/rea-*.tar.gz; do
  if command -v sha256sum >/dev/null 2>&1; then sum=$(sha256sum "$f" | cut -d' ' -f1); else sum=$(shasum -a 256 "$f" | cut -d' ' -f1); fi
  echo "$(basename "$f") $sum $(wc -c < "$f" | tr -d ' ')"
done
[ -n "${DOWNLOADS_BUCKET:-}" ] || { echo "DOWNLOADS_BUCKET not set; built only, nothing uploaded" >&2; exit 0; }
aws s3 cp "$out" "s3://$DOWNLOADS_BUCKET/tools/rea/$version/" --recursive --exclude '*' --include 'rea-*.tar.gz'
