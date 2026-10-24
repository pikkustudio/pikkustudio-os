# @pikkustudio/vault

A local secret vault for Studio: a process that stores sealed secrets in SQLite and serves them over a unix socket.

- Server (`src/server.ts`, run with `bun run start`): keeps `vault.sock`, `vault.db`, `vault-key.json` and an admin token in `PIKKU_VAULT_HOME` (default `~/.pikkustudio`). It exits quietly if a vault is already live on the socket.
- Values are sealed with the vault's public key before they are sent, and the vault keeps an audit log of access.
- `./client` is `VaultClientSecretService`, a Pikku `SecretService` that reads from the vault (with an optional fallback).
- `./admin` is `VaultAdmin`, for listing, writing and deleting keys and reading activity.
- `./connect` (`connectVault`) finds a running vault or starts one and returns both; `packages/functions/src/services.ts` uses it.
- `bun run test` runs the tests in `test/`.
