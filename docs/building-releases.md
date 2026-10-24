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

## Web edition

The web Studio at cloud.pikkustudio.app is the frontend only: the cloud and web addons linked, `VITE_STUDIO_LOCAL=false`, and the API at controlplane.

```
bun run build:hosted
cd apps/studio && bunx wrangler deploy -c wrangler.hosted.jsonc
```

`build:hosted` (`scripts/build-hosted.sh`) links the addons, runs `prebuild`, builds into `apps/studio/dist/client` and then puts the link state and `pikku-addons.lock` back as they were; `PIKKUSTUDIO_API_URL` overrides `https://api.pikkustudio.app`. `wrangler.hosted.jsonc` is the `pikkustudio-cloud` Worker on the `cloud.pikkustudio.app` custom domain: static assets with SPA fallback, hashed `/assets/*` cached for a year. It never proxies the API. `bunx wrangler dev -c wrangler.hosted.jsonc` serves the same build locally.

On the web a cloud project's (`cloud:<projectId>`) own `studio:*` calls and its `/p/<key>/rpc/*` calls go to `{api}/workspace/<projectId>/…` (the URL `cloud:workspaceLink` returns), waiting out the gateway's 503 while the workspace starts (`packages/ui-blocks/src/lib/workspace-route.ts`).

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

`release-build.sh linux/arm64` or `linux/x64` cross-builds from a Mac but skips the boot check. Check it in `debian:stable-slim` with `scripts/release-check.sh`, which extracts it, runs `./os db migrate` (it must report `Applied N migration(s).`), starts `PORT=4750 ./os` and requires 200 from `/studio/health` and `/`:

```
docker run --rm -v "$PWD/dist-release:/dist:ro" -v "$PWD/scripts:/scripts:ro" debian:stable-slim \
  sh /scripts/release-check.sh /dist/studio-os-0.0.0-oss-linux-arm64.tar.gz
```

## Release builds in CI

`.github/workflows/release-build.yml` runs on every push to main, every pull request and on demand. It builds both editions for darwin-arm64 (macos-15), linux-arm64 (ubuntu-24.04-arm) and linux-x64 (ubuntu-24.04), each on its own architecture so `release-build.sh` boots it, boots the Linux tarballs again with `release-check.sh` in `debian:stable-slim`, and uploads every tarball as a workflow artifact (`studio-os-<target>`, `studio-<target>`, kept 14 days). It publishes nothing. It builds from the committed `bun.lock` only, never against a linked pikku, so it fails while the repo needs an unreleased `@pikku/*`.

The Cloud jobs need the `CLOUD_ADDON_DEPLOY_KEY` secret, which `desktop.yml` also uses, to check out `packages/pikkustudio-private`; without it they are skipped and the run summary says so. To enable them, once:

```
ssh-keygen -t ed25519 -N '' -C 'pikkustudio-os ci' -f pikkustudio-private-deploy-key
gh repo deploy-key add pikkustudio-private-deploy-key.pub -R pikkustudio/pikkustudio-private --title 'pikkustudio-os ci'
gh secret set CLOUD_ADDON_DEPLOY_KEY -R pikkustudio/pikkustudio-os < pikkustudio-private-deploy-key
rm pikkustudio-private-deploy-key pikkustudio-private-deploy-key.pub
```

`gh repo deploy-key add` adds a read-only key unless `--allow-write` is passed; leave it read-only. The same can be done in the web UI: pikkustudio-private, Settings, Deploy keys, Add deploy key (paste the `.pub` file, leave "Allow write access" off), then pikkustudio-os, Settings, Secrets and variables, Actions, New repository secret (paste the private key file). Pull requests from forks never receive the secret, so their Cloud jobs are skipped.
