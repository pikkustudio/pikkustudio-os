import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { SPECIALISTS, slotFor } from '@pikkustudio/builder'

export const BuilderCancelInput = z.object({ key: z.string(), specialist: z.enum(SPECIALISTS).optional(), agent: z.string().optional() })

export const builderCancel = pikkuSessionlessFunc({
  expose: true,
  description: 'Stop what the builder is doing.',
  input: BuilderCancelInput,
  func: async ({ studioBuilder }, { key, specialist, agent }) => {
    const slot = slotFor(key, specialist, agent)
    studioBuilder.cancel(slot)
    return studioBuilder.state(slot)
  },
})
