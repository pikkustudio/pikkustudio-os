import { z } from 'zod'

export const PublishOptionsOutput = z.object({
  targets: z.record(z.string(), z.string()),
  consoleUrl: z.string(),
  prompts: z.object({
    standalone: z.string(),
    cloudflare: z.string(),
    serverless: z.string(),
    azure: z.string(),
  }),
})
