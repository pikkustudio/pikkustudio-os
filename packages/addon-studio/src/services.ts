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
    autoInstall: (process.env.PIKKU_STUDIO_TOOLS_AUTO_INSTALL ?? '').split(',').map((id) => id.trim()).filter(Boolean).concat('impeccable', 'chromium'),
    projectDir: () => process.env.PIKKU_STUDIO_PROJECT || undefined,
    onDeclared: (message) => console.info(`[studio] ${message}`),
  })
  void studioTools.ensureDeclared().catch(() => {})
  // The builder's design skill and the headless browser scenarios run in: fetched once in the background (the browser is ~100MB, so
  // startup never waits on it), then handed to every builder run, project dev server and test through the process env they inherit.
  // The env names are the tools' own (manifest.json), so each is exported exactly as resolved.
  for (const tool of ['impeccable', 'chromium']) {
    void studioTools
      .ensure([{ tool, requestedBy: 'builder' }])
      .then(([resolved]) => {
        if (resolved?.status !== 'found' && resolved?.status !== 'installed') return
        for (const [name, value] of Object.entries(resolved.env)) process.env[name] ||= value
        console.info(`[studio] tool ${tool} ready (${resolved.status} ${resolved.version ?? ''})`.trim())
      })
      .catch((error) => console.warn(`[studio] tool ${tool} could not be prepared: ${error instanceof Error ? error.message : String(error)}`))
  }
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
