# Clearing away finished session worktrees

Every builder session gets its own worktree (`<projects>/<id>/s-xxxx`, key `<id>.s-xxxx`). Most are merged into
`develop` and never opened again. Studio sweeps those (`services/worktree-sweep.ts`). It only ever considers folders
whose name matches `SESSION` (`s-` and four hex digits): never `main`, `develop`, the live branch or a named workspace.

## What makes a session a candidate

All of these must hold; anything else is kept and reported with the reason.

- merged into `develop` (ancestor check; keeps are ff-only, so ancestor is right)
- clean: `git status --porcelain --untracked-files=all` is empty
- no commit that is only on this branch (checked against `develop` and every remote)
- not locked, not running in Studio (supervisor, dev server, apps), and no process anywhere with its working directory
  inside it (one `lsof` call; if `lsof` cannot answer, the session is kept)
- idle longer than the limit (default 7 days, `PIKKU_STUDIO_SWEEP_IDLE_DAYS`) counted from the newest of the last
  commit, the index, the worktree's reflog and any file written in it (not `node_modules` or `.git`)

## Removing

The default is a dry run. Removal is on with `PIKKU_STUDIO_SWEEP_REMOVE=1` (the hourly sweep and the one at startup) or
`remove: true` on `studio:reapSessions`, which otherwise only reports. Removal runs
`wt remove <branch> --foreground --no-hooks --format json --config <home>/worktrunk-empty.toml` in `repo.git`: never
`-f`, `-D` or `--reap`, and never the person's own worktrunk config. `wt` is found on PATH or at
`PIKKU_STUDIO_WT`; without it the sweep says "wt not available" and does nothing. After a removal Studio deletes
`<home>/design/<key>` and `<home>/logs/<key>-design.log` and forgets the install mark (`forgetSession`).

## Why Studio picks the candidates and not `wt step prune`

A spike showed `wt step prune` deletes `main` when its target is `develop`, counts `--min-age` from creation rather than
from activity, and takes a fresh empty session for merged. So Studio selects, and worktrunk only does the removal.

## Starting a session with installed deps

`createSession` runs `wt -C <new worktree> --config <home>/worktrunk-empty.toml step copy-ignored --from develop --require-include -y`
after `git worktree add` (`seedWorktree` in `services/worktree.ts`; same `wt` lookup and empty config as the sweep). On
APFS and other reflink filesystems the copies are copy-on-write, so they cost almost no disk. `--require-include` means
only paths listed in the project's tracked `.worktreeinclude` are copied. New projects get one from Studio
(`node_modules/`, `dist/`, `.vite/`); never `.env`, caches, logs or the database. Existing projects without the file copy
nothing, as before. A missing `wt`, a non-zero exit or a timeout (2 minutes) logs a warning and leaves the plain worktree.
