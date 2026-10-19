---
'@pikkustudio/addon-studio': minor
'@pikkustudio/blocks': minor
---

`studio:projectStageAudit` reads the published app's history from a contributed `stageAudit` service, and the updates feed calls it instead of the `useStageAudit` slot, which is removed. Without the service (plain Studio) it answers not readable, as before. In hosted mode `studio:` calls go to the sandbox's Studio, which cannot read the cloud, so the published app's history stays empty there until a hosted backend exists.
