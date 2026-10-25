import type { Contributor } from '@pikku/core/contributors'
import { kyselyLogSource } from '../sources.js'

/** Workspace logs and metrics, read from the tables this computer's collector writes. Other hosts add their own kinds (stage, sandbox) next to it. */
export const studioSources: Contributor = {
  needs: ['kysely'],
  provides: ['logSources', 'logSources.workspace', 'metricSources', 'metricSources.workspace'],
  run: (services, _env, runtime) => {
    const studioWorkspace = kyselyLogSource(runtime.kysely)
    services.logSources = { workspace: studioWorkspace }
    services.metricSources = { workspace: studioWorkspace }
  },
}
