import { pikkuConfig } from '#pikku/setup'

export const createConfig = pikkuConfig(async () => ({
  port: parseInt(process.env.PORT || '4003', 10),
  hostname: process.env.HOST || '127.0.0.1',
}))
