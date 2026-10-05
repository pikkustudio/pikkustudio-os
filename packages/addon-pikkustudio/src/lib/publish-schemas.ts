import { z } from 'zod'

export const PublishJobOutput = z.object({
  state: z.enum(['idle', 'running', 'done', 'failed']),
  url: z.string().nullable(),
  error: z.string().nullable(),
  log: z.array(z.string()),
})

export const PublishOptionsOutput = z.object({
  fabric: z.enum(['ready', 'sign-in', 'not-in-fabric']),
  consoleUrl: z.string(),
  prompts: z.object({
    standalone: z.string(),
    cloudflare: z.string(),
    serverless: z.string(),
    azure: z.string(),
  }),
})
