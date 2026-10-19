---
'@pikkustudio/addon-studio': minor
'@pikkustudio/blocks': minor
---

Logs and Metrics read through contributed sources keyed by target (workspace, sandbox, stage). addon-studio ships the `studioSources` contributor for the workspace kind, `projectLogEntries` takes a target and server-side filters, and the new `projectMetricsSummary` and `projectTargets` back one Metrics screen for every copy. Log lines now keep the tenant they ran for (migration 0018). The `StageLogs` slot is gone; `useLiveMetrics` stays for Performance only.
