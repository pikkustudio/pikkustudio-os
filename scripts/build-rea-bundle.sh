#!/bin/sh
set -eu
platform=${1:?usage: build-rea-bundle.sh <darwin-arm64|darwin-x64|linux-arm64|linux-x64> <rea-version> [out-dir]}
version=${2:?rea version required}
root=$(cd "$(dirname "$0")/.." && pwd)
out=${3:-$root/.deploy/rea}
case "$platform" in
  darwin-arm64) os=darwin cpu=arm64 ;;
  darwin-x64) os=darwin cpu=x64 ;;
  linux-arm64) os=linux cpu=arm64 ;;
  linux-x64) os=linux cpu=x64 ;;
  *) echo "no rea bundle for $platform" >&2; exit 1 ;;
esac
name="rea-$version-$platform"
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
stage="$tmp/$name"
mkdir -p "$stage/bin"
printf '{"name":"rea-bundle","private":true}\n' > "$stage/package.json"
bun add --cwd "$stage" --ignore-scripts --os "$os" --cpu "$cpu" "rea-agents@$version" >&2
rm -rf "$stage/node_modules/frida" "$stage/bun.lock" "$stage/bun.lockb" "$stage/package.json"
pty="$stage/node_modules/@lydell/node-pty-$platform"
[ -d "$pty" ] || { echo "missing native pty package for $platform" >&2; exit 1; }
for other in "$stage"/node_modules/@lydell/node-pty-*; do
  [ "$other" = "$pty" ] || rm -rf "$other"
done
cat > "$stage/bin/rea" <<'L'
#!/bin/sh
self=$0
while [ -h "$self" ]; do
  dir=$(cd "$(dirname "$self")" && pwd)
  self=$(readlink "$self")
  case "$self" in /*) ;; *) self="$dir/$self" ;; esac
done
here=$(cd "$(dirname "$self")/.." && pwd)
entry="$here/node_modules/rea-agents/scripts/rea.mjs"
if command -v node >/dev/null 2>&1; then exec node "$entry" "$@"; fi
exec bun "$entry" "$@"
L
chmod 755 "$stage/bin/rea"
find "$stage" -exec touch -h -t 200001010000 {} +
mkdir -p "$out"
archive="$out/$name.tar.gz"
list="$tmp/files"
(cd "$tmp" && find "$name" | LC_ALL=C sort > "$list")
export COPYFILE_DISABLE=1
if tar --version 2>/dev/null | grep -q GNU; then
  (cd "$tmp" && tar --no-recursion --owner=0 --group=0 --numeric-owner -T "$list" -cf - | gzip -n -9 > "$archive")
else
  (cd "$tmp" && tar --no-recursion --uid 0 --gid 0 --uname '' --gname '' -T "$list" -cf - | gzip -n -9 > "$archive")
fi
if command -v sha256sum >/dev/null 2>&1; then sum=$(sha256sum "$archive" | cut -d' ' -f1); else sum=$(shasum -a 256 "$archive" | cut -d' ' -f1); fi
size=$(wc -c < "$archive" | tr -d ' ')
echo "$archive"
echo "sha256 $sum"
echo "size $size"
