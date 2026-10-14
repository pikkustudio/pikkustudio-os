import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'

export const HealthInput = z.object({})

export const HealthOutput = z.object({ ok: z.literal(true) })

export const health = pikkuSessionlessFunc({
  description: 'Whether Studio is up. Counts as no use.',
  input: HealthInput,
  output: HealthOutput,
  func: async () => ({ ok: true as const }),
})
