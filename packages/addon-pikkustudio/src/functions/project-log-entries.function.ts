import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectLogEntriesInput = z.object({
  key: z.string(),
  since: z.number().optional(),
  limit: z.number().optional(),
})

export const ProjectLogEntriesOutput = z.object({
  entries: z.array(
    z.object({
      id: z.number(),
      at: z.number(),
      level: z.enum(['error', 'warn', 'info']),
      source: z.string(),
      wire: z.string().nullable(),
      fn: z.string().nullable(),
      ms: z.number().nullable(),
      trace: z.string().nullable(),
      text: z.string(),
    })
  ),
})

export const projectLogEntries = pikkuSessionlessFunc({
  expose: true,
  description: "A project's recent log lines, newest first, from every place it runs.",
  input: ProjectLogEntriesInput,
  output: ProjectLogEntriesOutput,
  func: async ({ studioLogs }, { key, since, limit }) => ({
    entries: await studioLogs.list(key, { since, limit: Math.min(limit ?? 500, 2000) }),
  }),
})
