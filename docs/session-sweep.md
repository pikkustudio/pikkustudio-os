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
after `git worktree add` (`seedWorktree` in `services/worktree.ts`; same `wt` lookup and empty config as the sweep).
`--require-include` means only paths listed in the project's tracked `.worktreeinclude` are copied. New projects get one
from Studio (`node_modules/`, `dist/`, `.vite/`); never `.env`, caches, logs or the database. Existing projects without
the file copy nothing and install nothing, as before.

Reflink filesystems and others differ. Studio probes the layout's volume once (`cp --reflink=always`, `cp -c` on macOS,
on a small file; asked once per volume per process):

- Copy-on-write (APFS, btrfs, xfs): everything is cloned. A frozen install (`bun install --frozen-lockfile`, or pnpm's)
  runs only if the lockfile in the new worktree differs from develop's.
- No reflink (ext4): `wt` only plans (`--dry-run --format json`); entries outside `node_modules` (`dist/`, `.vite/`) are
  copied, and `node_modules` is not. A frozen install with `--backend=hardlink` fills it from the package manager's
  cache. Measured on ext4 with the starter's ~780 packages: 13 MB of new disk and about 0.5 s, against 860 MB for a
  full copy. Only bun and pnpm projects (lockfile present) are installed this way; others keep the plain worktree and
  install on first use as before.

`wt` needs git 2.43 or newer; with older git Studio logs "worktrunk needs git 2.43+" and does not run it. `wt` and the
install run in their own process group and a timeout (2 minutes; 4 for the install) kills the whole group, so a hung `wt`
that forked leaves nothing behind. Any failure logs a warning with the first lines of the tool's stderr and leaves the
plain worktree. `PIKKU_STUDIO_SEED_TIMEOUT_MS` overrides the timeout (tests).
