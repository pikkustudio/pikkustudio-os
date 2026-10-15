import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const SetAiInput = z.union([
  z.object({ kind: z.literal('cloud') }),
  z.object({ kind: z.literal('key'), provider: z.string(), apiKey: z.string(), model: z.string().optional(), baseUrl: z.string().optional() }),
  z.object({ kind: z.literal('subscription'), provider: z.string() }),
])

export const setAi = pikkuSessionlessFunc({
  expose: true,
  description: 'Choose the AI Studio builds with.',
  input: SetAiInput,
  func: async ({ studioAi }, input) => studioAi.set(input),
})
