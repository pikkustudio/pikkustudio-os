import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { SPECIALISTS, slotKey } from '@pikku/builder'

export const BuilderCancelInput = z.object({ key: z.string(), specialist: z.enum(SPECIALISTS).optional() })

export const builderCancel = pikkuSessionlessFunc({
  expose: true,
  description: 'Stop what the builder is doing.',
  input: BuilderCancelInput,
  func: async ({ studioBuilder }, { key, specialist }) => {
    const slot = slotKey(key, specialist)
    studioBuilder.cancel(slot)
    return studioBuilder.state(slot)
  },
})
