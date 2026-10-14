import { JsonConsoleLogger, LocalSecretService, LocalVariablesService } from '@pikku/core/services'
import { CFWorkerSchemaService } from '@pikku/schema-cfworker'
import { pikkuServices } from '#pikku/setup'

process.env.BETTER_AUTH_SECRET ??= 'addons-project-local'

export const createSingletonServices = pikkuServices(async (config, existing) => {
  if (!existing?.kysely || !existing?.content) throw new Error('The runtime did not provide the database and content storage')
  const logger = existing.logger ?? new JsonConsoleLogger()
  const variables = existing.variables ?? new LocalVariablesService()
  return {
    ...existing,
    config,
    logger,
    variables,
    secrets: existing.secrets ?? new LocalSecretService(variables),
    schema: existing.schema ?? new CFWorkerSchemaService(logger),
    kysely: existing.kysely,
    content: existing.content,
  }
})
