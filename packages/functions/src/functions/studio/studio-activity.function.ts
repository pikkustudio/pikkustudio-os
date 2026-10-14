import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'

export const StudioActivityInput = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  key: z.string().optional(),
})

export const StudioActivityOutput = z.object({
  events: z.array(
    z.object({
      at: z.string(),
      type: z.string(),
      subject: z.string().nullable(),
      project: z.string().nullable(),
      outcome: z.enum(['success', 'failed']),
    }),
  ),
})

export const studioActivity = pikkuFunc({
  expose: true,
  auth: true,
  description: 'What happened in Studio itself: signing in, choosing the AI, publishing. Newest first.',
  input: StudioActivityInput,
  output: StudioActivityOutput,
  func: async ({ studio }, { limit, key }) => ({ events: studio.audit.read(limit ?? 50, key) }),
})
