#!/bin/sh
set -eu
platform=${1:-linux/arm64}
version=${UV_VERSION:-0.12.22}
root=$(cd "$(dirname "$0")/.." && pwd)
target=$(echo "$platform" | tr / -)
case "$target" in
  darwin-arm64) triple=aarch64-apple-darwin ;;
  darwin-x64) triple=x86_64-apple-darwin ;;
  linux-arm64) triple=aarch64-unknown-linux-musl ;;
  linux-x64) triple=x86_64-unknown-linux-musl ;;
  *) echo "no uv build for $platform" >&2; exit 1 ;;
esac
out="$root/.deploy/uv/$target"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
url="https://github.com/astral-sh/uv/releases/download/$version/uv-$triple.tar.gz"
curl -fsSL "$url" -o "$tmp/uv.tar.gz"
expected=$(curl -fsSL "$url.sha256" | cut -d' ' -f1)
actual=$( (sha256sum "$tmp/uv.tar.gz" 2>/dev/null || shasum -a 256 "$tmp/uv.tar.gz") | cut -d' ' -f1)
[ "$expected" = "$actual" ] || { echo "uv checksum mismatch for $triple" >&2; exit 1; }
tar xzf "$tmp/uv.tar.gz" -C "$tmp"
rm -rf "$out" && mkdir -p "$out/bin"
cp "$tmp/uv-$triple/uv" "$tmp/uv-$triple/uvx" "$out/bin/"
du -sh "$out"/bin/uv
