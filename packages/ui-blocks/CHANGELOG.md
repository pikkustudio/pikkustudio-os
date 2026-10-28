# @pikkustudio/blocks

## 0.1.0

### Minor Changes

- 09cf3cb: Logs and Metrics read through contributed sources keyed by target (workspace, sandbox, stage). addon-studio ships the `studioSources` contributor for the workspace kind, `projectLogEntries` takes a target and server-side filters, and the new `projectMetricsSummary` and `projectTargets` back one Metrics screen for every copy. Log lines now keep the tenant they ran for (migration 0018). The `StageLogs` slot is gone; `useLiveMetrics` stays for Performance only.
- c73a934: `studio:projectStageAudit` reads the published app's history from a contributed `stageAudit` service, and the updates feed calls it instead of the `useStageAudit` slot, which is removed. Without the service (plain Studio) it answers not readable, as before. In hosted mode `studio:` calls go to the sandbox's Studio, which cannot read the cloud, so the published app's history stays empty there until a hosted backend exists.
