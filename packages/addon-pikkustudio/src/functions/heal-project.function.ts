import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const HealProjectInput = z.object({ key: z.string(), problem: z.string() })
export const HealProjectOutput = z.object({ ok: z.boolean(), summary: z.string() })

export const healProject = pikkuSessionlessFunc({
  description: 'Ask the builder to get a project that will not start running again, as fast as it can.',
  input: HealProjectInput,
  output: HealProjectOutput,
  func: async ({ studioBuilder }, { key, problem }) => {
    return studioBuilder.heal(key, problem).catch((error) => ({ ok: false, summary: error instanceof Error ? error.message : String(error) }))
  },
})
