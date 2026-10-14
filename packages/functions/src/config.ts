import { homedir } from 'node:os'
import { join } from 'node:path'
import { pikkuConfig } from '#pikku/setup'

export const createConfig = pikkuConfig(async () => ({
  port: parseInt(process.env.API_PORT || '4003', 10),
  hostname: process.env.HOST || '0.0.0.0',
  content: { uploadUrlPrefix: '/upload', assetUrlPrefix: '/content', sizeLimit: '100mb' },
  sqliteDb: process.env.PIKKU_STUDIO_DB || join(process.env.PIKKU_STUDIO_HOME || join(homedir(), '.pikkustudio'), 'studio.db'),
}))
