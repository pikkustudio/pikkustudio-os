import { pikkuAddonServices, pikkuAddonWireServices } from '#pikku/setup'
import type { MetaSource } from './services/meta-source.interface.js'
import type { UiSource } from './services/ui-source.interface.js'
import type { RuntimeSignals } from './services/runtime-signals.interface.js'
import type { CommentStore, VerdictStore } from './lib/types.js'

const EMPTY_SIGNALS: RuntimeSignals = { read: async () => ({}) }
const EMPTY_UI: UiSource = { read: async () => null }

export const createSingletonServices = pikkuAddonServices(async (_config, existingServices) => {
  const { logger } = existingServices
  if (!logger) {
    throw new Error('The review addon needs the host logger, but none was injected')
  }

  const verdictStore = existingServices.verdictStore as unknown as VerdictStore
  if (!verdictStore) {
    throw new Error('The review addon needs a verdictStore, but none was injected')
  }

  const commentStore = existingServices.commentStore as unknown as CommentStore
  if (!commentStore) {
    throw new Error('The review addon needs a commentStore, but none was injected')
  }

  const metaSource = existingServices.metaSource as unknown as MetaSource
  if (!metaSource) {
    throw new Error('The review addon needs a metaSource, but none was injected')
  }

  const uiSource = (existingServices.uiSource as unknown as UiSource) ?? EMPTY_UI

  const runtimeSignals =
    (existingServices.runtimeSignals as unknown as RuntimeSignals) ?? EMPTY_SIGNALS

  const { config: _hostConfig, ...hostServices } = existingServices as Record<string, unknown>

  return { ...hostServices, verdictStore, commentStore, metaSource, uiSource, runtimeSignals }
})

export const createWireServices = pikkuAddonWireServices(async () => {
  return {}
})
