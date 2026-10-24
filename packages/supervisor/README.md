# @pikkustudio/supervisor

Starts and watches long-running local processes (a project's dev server, for example) for Studio.

- `new Supervisor(options)` manages services described by a `ServiceSpec`: command, args, cwd, env, port, log path, an optional `ready` check, `restart` policy (`never` or `on-crash`) and `maxRestarts`.
- It tracks each service's state (`starting`, `ready`, `restarting`, `failed`, `stopped`), restarts crashed ones with backoff, keeps a log tail, and emits `SupervisorEvent`s on state changes.
- Options include a pid file (used to clean up stray processes from an earlier run), grace and ready timeouts, and an injectable clock.
- Exports come from `dist/` (`bun run build` runs `tsc`); `bun run test` runs the tests in `test/`.
