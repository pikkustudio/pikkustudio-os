import { pikkuAddonServices } from '#pikku/addon/setup'
import { createStudioServices, fileProjectStore, kyselyProjectStore } from './services/studio.js'
import { kyselyLogStore } from './services/log-store.js'
import { studioHome } from './services/projects.js'
import { shimsDir } from '@pikkustudio/builder'
import { delimiter } from 'node:path'
import { ToolResolver } from './lib/tools/resolver.js'

export const createSingletonServices = pikkuAddonServices(async (_config, { auth, kysely, logSources, metricSources, stageDirectory, stageAudit, stageReleases, stageSettings, stageAnalytics, accountSource, targetSources, notificationSource }) => {
  const {
    studioAi,
    studioProjects,
    studioPublisher,
    studioBuilder,
    studioSettings,
    studioHooks,
    studioLogs,
    studioModels,
  } = await createStudioServices({
    logStore: kysely ? kyselyLogStore(kysely) : undefined,
    projectStore: kysely ? kyselyProjectStore(kysely, fileProjectStore(studioHome())) : undefined,
  })
  const home = studioHome()
  const studioTools = new ToolResolver({
    home,
    shimsDirs: [shimsDir(home), shimsDir(home, home)],
    coreBin: () => (process.env.PIKKU_STUDIO_CORE_BIN ?? '').split(delimiter).filter(Boolean),
    autoInstall: (process.env.PIKKU_STUDIO_TOOLS_AUTO_INSTALL ?? '').split(',').map((id) => id.trim()).filter(Boolean),
    projectDir: () => process.env.PIKKU_STUDIO_PROJECT || undefined,
    onDeclared: (message) => console.info(`[studio] ${message}`),
  })
  void studioTools.ensureDeclared().catch(() => {})
  return {
    auth,
    studioTools,
    studioAi,
    studioProjects,
    studioPublisher,
    studioBuilder,
    studioSettings,
    studioHooks,
    studioLogs,
    studioModels,
    logSources,
    metricSources,
    stageDirectory,
    stageAudit,
    stageReleases,
    stageSettings,
    stageAnalytics,
    accountSource,
    targetSources,
    notificationSource,
  }
})
