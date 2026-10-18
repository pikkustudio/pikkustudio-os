# @pikkustudio/addon-inbox

Keeps every message a project app sends (emails today, other channels later) in a Studio-owned inbox for 7 days. Nothing is delivered. Each row has a `channel` ('email' or 'sms'); adding a channel is one line in `CHANNELS` in `src/lib/types.ts`.

## Local runs

Local capture works through a pikku dev platform-service contributor (`@pikkustudio/addon-inbox/contributor`, needs a pikku CLI with `dev.contributors`). Studio adds `STUDIO_INBOX_URL` and `STUDIO_INBOX_TOKEN` to the project's dev env. When both are set, the generated `.pikku/pikku-dev-platform-services.gen.ts` installs an `emailService` that POSTs each send to `inbox:recordMessage` with channel 'email'; otherwise `emailService` is left alone. The token is minted by Studio and fixes the project and stage, so the payload cannot choose them.

Studio starts `pikku dev --config __pikku_studio.pikku.config.json`, an overlay it writes next to the project's `pikku.config.json` (excluded from git). It extends the project config and adds the contributor, so the project's own files are not edited.

To use it outside Studio, a project needs this one line in `pikku.config.json`:

```json
{ "dev": { "contributors": [{ "module": "@pikkustudio/addon-inbox/contributor" }] } }
```

The capture service is emitted inline into the generated file, so it has no imports and typechecks under the project's own `tsc` in a project that does not depend on this package. It sends the already-rendered html and text; a template-only send is recorded with its template name and data.

## Hosted stages

Use `createInboxContributor` as an `inbox` contributor next to `packages/deploy-cloudflare/src/contributors/audit.ts` in the cloud repo. It should bind an `emailService` whose `send` POSTs to `${PLATFORM_API_URL}/rpc/inbox:recordMessage` with body `{ data: { token, message } }` and `message.channel` set to 'email'. `token` comes from `mintInboxToken({ secret, projectKey: <project id>, stage: <stage branch> })` using the secret the platform shares with the stage (the same one the audit contributor uses as `PIKKUSTUDIO_PRODUCER_SECRET`). `message` has the shape of `RecordedMessageSchema`. Set `inboxSecret` on the platform host to that secret.

## Access

`inboxAccess` is optional. Without it any signed-in user can read any project's inbox, which is only acceptable for a single-user local Studio. A hosted host must provide `inboxAccess` so only project members can read.
