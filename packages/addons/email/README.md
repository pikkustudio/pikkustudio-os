# @pikkustudio/addon-email

Keeps every email a project app sends in a Studio-owned inbox for 7 days. Nothing is delivered.

## Local runs

Studio adds `STUDIO_EMAIL_INBOX_URL` and `STUDIO_EMAIL_INBOX_TOKEN` to the project's dev env. `src/services/dev-services.ts` turns them into an `emailService` that POSTs each send to `email:recordEmail`. The token is minted by Studio and fixes the project and stage, so the payload cannot choose them.

pikku's generated `createLocalServices` always installs `LocalEmailService`, so a hook is needed for the app to load `dev-services.ts`: an env-named override module merged after `createLocalServices` in `pikku dev` and `pikku serve`.

## Hosted stages

Add an `email` contributor next to `packages/deploy-cloudflare/src/contributors/audit.ts` in the cloud repo. It should bind an `emailService` whose `send` POSTs to `${PLATFORM_API_URL}/rpc/email:recordEmail` with body `{ data: { token, message } }`, where `token` comes from `mintInboxToken({ secret, projectKey: <project id>, stage: <stage branch> })` using the secret the platform shares with the stage (the same one the audit contributor uses as `PIKKUSTUDIO_PRODUCER_SECRET`). `message` has the shape of `RecordedEmailSchema`. Set `inboxSecret` on the platform host to that secret and provide `inboxAccess` so only project members can read.
