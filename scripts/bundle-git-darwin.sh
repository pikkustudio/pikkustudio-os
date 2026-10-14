#!/bin/bash
set -eu
[ "$(uname -s)" = Darwin ] || { echo "bundle-git-darwin.sh builds the macOS git and must run on macOS" >&2; exit 1; }
arch=$(uname -m)
case "$arch" in
  arm64) target=darwin-arm64 ;;
  x86_64) target=darwin-x64 ;;
  *) echo "unsupported arch $arch" >&2; exit 1 ;;
esac
prefix=${GIT_PREFIX:-$(brew --prefix git)}
root=$(cd "$(dirname "$0")/.." && pwd)
out="$root/.deploy/git/$target"
rm -rf "$out" && mkdir -p "$out/bin" "$out/lib" "$out/libexec/git-core" "$out/share/git-core" "$out/etc"
cp "$prefix/bin/git" "$out/bin/git"
cp "$prefix/libexec/git-core/git-remote-http" "$out/libexec/git-core/git-remote-http"
cp -R "$prefix/share/git-core/templates" "$out/share/git-core/templates"
cp /etc/ssl/cert.pem "$out/etc/ca-certificates.crt"
chmod -R u+w "$out"

bundle() {
  local bin=$1 depth=$2
  otool -L "$bin" | tail -n +2 | awk '{print $1}' | while read -r dep; do
    case "$dep" in
      /usr/lib/*|/System/*|@*) continue ;;
    esac
    name=$(basename "$dep")
    real=$(cd "$(dirname "$dep")" && pwd -P)/$name
    if [ ! -f "$out/lib/$name" ]; then
      cp "$real" "$out/lib/$name"
      chmod u+w "$out/lib/$name"
      install_name_tool -id "@loader_path/$name" "$out/lib/$name" 2>/dev/null
      bundle "$out/lib/$name" lib
    fi
    case "$depth" in
      bin) install_name_tool -change "$dep" "@loader_path/../lib/$name" "$bin" ;;
      libexec) install_name_tool -change "$dep" "@loader_path/../../lib/$name" "$bin" ;;
      lib) install_name_tool -change "$dep" "@loader_path/$name" "$bin" ;;
    esac
  done
}
bundle "$out/bin/git" bin
bundle "$out/libexec/git-core/git-remote-http" libexec
find "$out" -type f \( -perm -u+x -o -name '*.dylib' \) | while read -r f; do
  if file "$f" | grep -q Mach-O; then codesign --force --sign - "$f" >/dev/null; fi
done
"$out/bin/git" --version
du -sh "$out"
