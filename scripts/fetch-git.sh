#!/bin/sh
set -eu
platform=${1:?usage: fetch-git.sh <os>/<arch>}
version=${GIT_VERSION:-2.56}
root=$(cd "$(dirname "$0")/.." && pwd)
target=$(echo "$platform" | tr / -)
case "$target" in
  darwin-arm64) subdir=osx-arm64 ;;
  darwin-x64) subdir=osx-64 ;;
  linux-x64) subdir=linux-64 ;;
  linux-arm64) subdir=linux-aarch64 ;;
  *) echo "fetch-git.sh: unsupported platform $platform" >&2; exit 1 ;;
esac
case "$(uname -s)-$(uname -m)" in
  Darwin-arm64) host=osx-arm64 ;;
  Darwin-x86_64) host=osx-64 ;;
  Linux-aarch64 | Linux-arm64) host=linux-aarch64 ;;
  Linux-x86_64) host=linux-64 ;;
  *) echo "fetch-git.sh: unsupported host $(uname -sm)" >&2; exit 1 ;;
esac
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/bin"
curl -fsSL -o "$work/bin/micromamba" "https://github.com/mamba-org/micromamba-releases/releases/download/2.3.0-0/micromamba-$host"
chmod +x "$work/bin/micromamba"
MAMBA_ROOT_PREFIX="$work/root" CONDA_OVERRIDE_OSX=13.0 CONDA_OVERRIDE_GLIBC=2.28 \
  "$work/bin/micromamba" create -y -q -p "$work/env" --platform "$subdir" -c conda-forge --override-channels "git=$version" >/dev/null
pkgs="$work/root/pkgs"
src=$(ls -d "$pkgs"/git-"$version"*/ | head -1)
out="$root/.deploy/git/$target"
rm -rf "$out"
mkdir -p "$out/bin" "$out/lib" "$out/libexec/git-core" "$out/share/git-core" "$out/etc"
cp "$src/bin/git" "$out/bin/git"
cp "$src/libexec/git-core/git-remote-http" "$out/libexec/git-core/git-remote-http"
cp -R "$src/share/git-core/templates" "$out/share/git-core/templates"
cp "$(ls -d "$pkgs"/ca-certificates-*/ | head -1)ssl/cacert.pem" "$out/etc/ca-certificates.crt"
todo="$out/bin/git $out/libexec/git-core/git-remote-http"
while [ -n "$todo" ]; do
  next=''
  for f in $todo; do
    for name in $(grep -ao -e '@rpath/[A-Za-z0-9._+-]*\.dylib' -e 'lib[A-Za-z0-9_+-]*\.so[.0-9]*' "$f" | sed 's#@rpath/##' | sort -u); do
      [ -f "$out/lib/$name" ] && continue
      lib=$(ls "$pkgs"/*/lib/"$name" 2>/dev/null | head -1)
      if [ -z "$lib" ]; then
        case "$name" in
          *.dylib) echo "fetch-git.sh: no $name in the conda packages" >&2; exit 1 ;;
          *) continue ;;
        esac
      fi
      cp -L "$lib" "$out/lib/$name"
      next="$next $out/lib/$name"
    done
  done
  todo=$next
done
du -sh "$out"
