import { z } from 'zod'

export const PublishJobOutput = z.object({
  state: z.enum(['idle', 'running', 'done', 'failed']),
  url: z.string().nullable(),
  error: z.string().nullable(),
  log: z.array(z.string()),
})

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
