import type { PlatformServiceContributor } from '@pikku/deploy'

/** Workspace logs and metrics, read from the tables this computer's collector writes. Other hosts add their own kinds (stage, sandbox) next to it. */
export const studioSources: PlatformServiceContributor = {
  name: 'studio-sources',
  needs: ['kysely'],
  provides: ['logSources', 'logSources.workspace', 'metricSources', 'metricSources.workspace'],
  imports: [`import { kyselyLogSource as studioWorkspaceSource } from '@pikkustudio/addon-studio/sources'`],
  emit: () => [
    `  const studioWorkspace = studioWorkspaceSource(runtime.kysely)`,
    `  services.logSources = { workspace: studioWorkspace }`,
    `  services.metricSources = { workspace: studioWorkspace }`,
  ],
}
