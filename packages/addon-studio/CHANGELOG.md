# @pikkustudio/addon-studio

## 0.1.0

### Minor Changes

- 09cf3cb: Logs and Metrics read through contributed sources keyed by target (workspace, sandbox, stage). addon-studio ships the `studioSources` contributor for the workspace kind, `projectLogEntries` takes a target and server-side filters, and the new `projectMetricsSummary` and `projectTargets` back one Metrics screen for every copy. Log lines now keep the tenant they ran for (migration 0018). The `StageLogs` slot is gone; `useLiveMetrics` stays for Performance only.
- c73a934: `studio:projectStageAudit` reads the published app's history from a contributed `stageAudit` service, and the updates feed calls it instead of the `useStageAudit` slot, which is removed. Without the service (plain Studio) it answers not readable, as before. In hosted mode `studio:` calls go to the sandbox's Studio, which cannot read the cloud, so the published app's history stays empty there until a hosted backend exists.

### Patch Changes

- 5ed1d4d: New session worktrees start with installed dependencies and build output through worktrunk and the project's `.worktreeinclude`: cloned where the disk supports copy-on-write, and on other filesystems (ext4) with build output copied and `node_modules` from a hard-linked frozen install instead of a full copy. A hung `wt` or install is killed with everything it forked, a failure logs the tool's stderr, and git older than 2.43 is reported instead of run. New projects get a `.worktreeinclude`; `.env` is never copied.
- e80cdbb: The session sweep no longer refreshes a worktree's index (all its git calls are read-only), so a dry run and the run after it agree. After removing a session it deletes the `s-xxxx` branch with `git branch -d` when merged into develop, the sweep clears orphaned merged `s-xxxx` branches (reported under `branches`), and `createSession` skips names that already exist as branches. Unmerged branches are never deleted.
- Updated dependencies [18cad2c]
  - @pikkustudio/builder@0.12.1
