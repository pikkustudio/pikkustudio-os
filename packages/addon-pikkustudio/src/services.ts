import { pikkuAddonServices } from '#pikku/addon/setup'
import { createStudioServices, fileProjectStore, kyselyProjectStore } from './services/studio.js'
import { kyselyLogStore } from './services/log-store.js'
import { studioHome } from './services/projects.js'

export const createSingletonServices = pikkuAddonServices(async (_config, { auth, kysely }) => {
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
  return {
    auth,
    studioAi,
    studioProjects,
    studioPublisher,
    studioBuilder,
    studioSettings,
    studioHooks,
    studioLogs,
    studioModels,
  }
})
