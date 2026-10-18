# @pikkustudio/addon-inbox

Keeps every message a project app sends (emails today, other channels later) in a Studio-owned inbox for 7 days. Nothing is delivered. Each row has a `channel` ('email' or 'sms'); adding a channel is one line in `CHANNELS` in `src/lib/types.ts`.

## Local runs

Studio adds `STUDIO_INBOX_URL` and `STUDIO_INBOX_TOKEN` to the project's dev env. `src/services/dev-services.ts` turns them into an `emailService` that POSTs each send to `inbox:recordMessage` with channel 'email'. The token is minted by Studio and fixes the project and stage, so the payload cannot choose them.

pikku's generated `createLocalServices` always installs `LocalEmailService`, so a hook is needed for the app to load `dev-services.ts`: an env-named override module merged after `createLocalServices` in `pikku dev` and `pikku serve`.

## Hosted stages

Add an `inbox` contributor next to `packages/deploy-cloudflare/src/contributors/audit.ts` in the cloud repo. It should bind an `emailService` whose `send` POSTs to `${PLATFORM_API_URL}/rpc/inbox:recordMessage` with body `{ data: { token, message } }` and `message.channel` set to 'email'. `token` comes from `mintInboxToken({ secret, projectKey: <project id>, stage: <stage branch> })` using the secret the platform shares with the stage (the same one the audit contributor uses as `PIKKUSTUDIO_PRODUCER_SECRET`). `message` has the shape of `RecordedMessageSchema`. Set `inboxSecret` on the platform host to that secret.

## Access

`inboxAccess` is optional. Without it any signed-in user can read any project's inbox, which is only acceptable for a single-user local Studio. A hosted host must provide `inboxAccess` so only project members can read.
