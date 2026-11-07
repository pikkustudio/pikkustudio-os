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

## Read-only git, and leftover branches

Every git call in the sweep runs with `--no-optional-locks` (and `GIT_OPTIONAL_LOCKS=0`), so `git status` never rewrites
a worktree's index. The index mtime counts as activity, so a sweep that refreshed it would make the next run say "used
0h ago". The sweep never changes any clock it reads.

`wt remove` leaves the `s-xxxx` branch behind. After a successful removal Studio deletes it with `git branch -d`
(never `-D`, run from the `develop` worktree so git re-checks it is merged into develop) when it is still merged into
`develop` with no commit missing from develop or a remote. The sweep also clears already-orphaned branches: names
matching `SESSION` that no worktree has checked out, not `main`, `develop` or the live branch, merged into `develop`,
nothing unpushed. Unmerged branches are never deleted. The report lists them under `branches` (`would-delete` in a
dry run, `deleted`, or `kept` with the reason); nothing changes without `remove: true`.
`createSession` picks a name with no folder and no branch of that name, so a leftover cannot collide.

## Why Studio picks the candidates and not `wt step prune`

A spike showed `wt step prune` deletes `main` when its target is `develop`, counts `--min-age` from creation rather than
from activity, and takes a fresh empty session for merged. So Studio selects, and worktrunk only does the removal.
