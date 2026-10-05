import { pikkuAddonServices } from '#pikku/addon/setup'

export const createSingletonServices = pikkuAddonServices(async (_config, { kysely, content, studio, workflowService }) => {
  if (!kysely || !content) throw new Error('Spindle needs the host database and content storage')
  return { kysely, content, studio, workflowService }
})
