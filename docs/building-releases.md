# Building releases

`scripts/release-build.sh <os>/<arch>` builds one standalone Studio tarball: the `os` binary, its bundle, the frontend, the SQLite migrations and the embedded runtime. On the host's own platform it boots the result and fails unless `/studio/health` answers.

Which edition it builds is set only by the addon link state in `.studio-addons/addons.json`, so set it explicitly before every build. The two builds share `.deploy/standalone`; run them one after the other, never together.

## Prerequisites

- bun (the version in `package.json` `packageManager`), node, curl and network access. `fetch-git.sh` downloads git and micromamba for each target the first time.
- `bun install --frozen-lockfile` at the repo root.
- Cloud only: `git submodule update --init --checkout packages/pikkustudio-private`, and the cloud addon SDKs (`@pikkustudio/addon-cloud-api`, `@pikkustudio/addon-admin-api`) published to the addon registry so `pikku all` can fetch the versions `pikku-addons.lock` pins.

## OS edition

```
node scripts/link-addon.mjs --unlink
RELEASE_VERSION=0.0.0-oss RELEASE_NAME=studio-os RELEASE_OUT=$PWD/dist-release sh scripts/release-build.sh darwin/arm64
```

Output: `dist-release/studio-os-0.0.0-oss-darwin-arm64.tar.gz`.

## Cloud edition

```
node scripts/link-addon.mjs
RELEASE_VERSION=0.0.0-cloud RELEASE_NAME=studio RELEASE_OUT=$PWD/dist-release sh scripts/release-build.sh darwin/arm64
node scripts/link-addon.mjs --unlink
```

Output: `dist-release/studio-0.0.0-cloud-darwin-arm64.tar.gz`. `link-addon.mjs --app` builds the app variant without the addon-web pages.

`prebuild` may rewrite `pikku-addons.lock` when the linked config wires fewer remote addons; `git checkout -- pikku-addons.lock` afterwards.

## Launching a tarball

```
mkdir -p /tmp/studio && tar xzf dist-release/studio-os-0.0.0-oss-darwin-arm64.tar.gz -C /tmp/studio && cd /tmp/studio/studio-os
export PIKKU_STUDIO_HOME=$(mktemp -d)
./os db migrate
PORT=4750 ./os &
curl -fsS http://localhost:4750/studio/health
```

A temporary `PIKKU_STUDIO_HOME` keeps the run away from `~/.pikkustudio`. The Cloud edition's folder is `studio/`. It calls `https://api.pikkustudio.app` unless `PIKKUSTUDIO_API_URL` points elsewhere.

`RELEASE_SMOKE_PORT` moves the build's own boot check off port 4740.

## Against an unreleased pikku

When the repo needs a `@pikku/*` change that is not on npm yet, build pikku from source and link it in before building:

```
cd ../pikku && PIKKU_CLI_WITHOUT_REGISTRY_SDK=1 bun run build:packages
cd - && PIKKU_DIR=../pikku node scripts/link-pikku.mjs
```

`PIKKU_CLI_WITHOUT_REGISTRY_SDK=1` is what pikku's own CI sets; without it the CLI build tries to download the registry SDK.

## Linux

`release-build.sh linux/arm64` or `linux/amd64` cross-builds from a Mac but skips the boot check. Check it in `debian:stable-slim`: extract, `./os db migrate`, `PORT=4750 ./os`, then curl `/studio/health`.
