import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { SPECIALISTS, slotFor } from '@pikkustudio/builder'

export const BuilderClearInput = z.object({ key: z.string(), specialist: z.enum(SPECIALISTS).optional(), agent: z.string().optional() })

export const builderClear = pikkuSessionlessFunc({
  expose: true,
  description: 'Start a new builder conversation.',
  input: BuilderClearInput,
  func: async ({ studioBuilder }, { key, specialist, agent }) => {
    const slot = slotFor(key, specialist, agent)
    await studioBuilder.clear(slot)
    return studioBuilder.state(slot)
  },
})
