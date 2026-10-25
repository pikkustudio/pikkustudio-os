# @pikkustudio/addon-inbox

Keeps every message a project app sends (emails today, other channels later) in a Studio-owned inbox for 7 days. Nothing is delivered. Each row has a `channel` ('email' or 'sms'); adding a channel is one line in `CHANNELS` in `src/lib/types.ts`.

## Local runs

Local capture works through the addon's `inbox` contributor. A project opts in with `contributors: ['inbox']` on its `wireAddon` call for this addon; `pikku dev` then installs it. Studio adds `STUDIO_INBOX_URL` and `STUDIO_INBOX_TOKEN` to the project's dev env. When both are set, the contributor installs an `emailService` that POSTs each send to `inbox:recordMessage` with channel 'email'; otherwise `emailService` is left alone. The token is minted by Studio and fixes the project and stage, so the payload cannot choose them.

```ts
wireAddon({ name: 'inbox', package: '@pikkustudio/addon-inbox', contributors: ['inbox'] })
```

A project that does not opt in keeps its own `emailService`; Studio does not edit the project's files or config.

## Hosted stages

The same `inbox` contributor has a deploy variant, so a stage that opts in gets it when `STUDIO_INBOX_URL` and `STUDIO_INBOX_TOKEN` are set. It should bind an `emailService` whose `send` POSTs to `${PLATFORM_API_URL}/rpc/inbox:recordMessage` with body `{ data: { token, message } }` and `message.channel` set to 'email'. `token` comes from `mintInboxToken({ secret, projectKey: <project id>, stage: <stage branch> })` using the secret the platform shares with the stage (the same one the audit contributor uses as `PIKKUSTUDIO_PRODUCER_SECRET`). `message` has the shape of `RecordedMessageSchema`. Set `inboxSecret` on the platform host to that secret.

## Access

`inboxAccess` is optional. Without it any signed-in user can read any project's inbox, which is only acceptable for a single-user local Studio. A hosted host must provide `inboxAccess` so only project members can read.
