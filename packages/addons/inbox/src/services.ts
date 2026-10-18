import { pikkuAddonServices, pikkuAddonWireServices } from '#pikku/setup'
import type { InboxAccess, InboxStore } from './lib/types.js'

export const createSingletonServices = pikkuAddonServices(async (_config, existingServices) => {
  const { logger } = existingServices
  if (!logger) {
    throw new Error('The inbox addon needs the host logger, but none was injected')
  }

  const inboxStore = existingServices.inboxStore as unknown as InboxStore
  if (!inboxStore) {
    throw new Error('The inbox addon needs an inboxStore, but none was injected')
  }

  const inboxAccess = (existingServices.inboxAccess as unknown as InboxAccess | undefined) ?? undefined
  const inboxSecret = (existingServices.inboxSecret as unknown as string | undefined) ?? process.env.STUDIO_INBOX_SECRET

  const { config: _hostConfig, ...hostServices } = existingServices as Record<string, unknown>

  return { ...hostServices, inboxStore, inboxAccess, inboxSecret }
})

export const createWireServices = pikkuAddonWireServices(async () => {
  return {}
})
