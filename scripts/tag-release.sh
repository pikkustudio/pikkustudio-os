#!/bin/sh
set -eu
v=$(node -p "require('./packages/release/package.json').version")
tag="v$v"
if git ls-remote --exit-code --tags origin "refs/tags/$tag" >/dev/null 2>&1; then
  echo "$tag already exists"
  exit 0
fi
gh api "repos/$GITHUB_REPOSITORY/git/refs" -f ref="refs/tags/$tag" -f sha="$GITHUB_SHA" >/dev/null
gh workflow run desktop.yml --ref "$tag"
echo "tagged $tag"
