#!/bin/sh
set -eu
bunx @changesets/cli version
v=$(node -p "require('./packages/release/package.json').version")
node -e "
const fs=require('fs');
const s=fs.readFileSync('bun.lock','utf8');
fs.writeFileSync('bun.lock',s.replace(/(\"name\": \"@pikkustudio\/release-os\",\n\s+\"version\": \")[^\"]+/,'\$1$v'));
"
