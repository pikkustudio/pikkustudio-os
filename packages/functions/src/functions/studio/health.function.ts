import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'
import { recordAccess } from '../../lib/sleep.js'

export const HealthInput = z.object({})

export const HealthOutput = z.object({ ok: z.literal(true) })

export const health = pikkuSessionlessFunc({
  description: 'Whether Studio is up. Counts as no use.',
  input: HealthInput,
  output: HealthOutput,
  func: async () => ({ ok: true as const }),
})

export const trafficCheck = pikkuSessionlessFunc({
  description: "Counts a visit to the project's app as use, so Studio stays awake while people are on it.",
  input: HealthInput,
  output: HealthOutput,
  func: async () => {
    recordAccess()
    return { ok: true as const }
  },
})
