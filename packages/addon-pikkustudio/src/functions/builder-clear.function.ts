import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { SPECIALISTS, slotKey } from '@pikkustudio/builder'

export const BuilderClearInput = z.object({ key: z.string(), specialist: z.enum(SPECIALISTS).optional() })

export const builderClear = pikkuSessionlessFunc({
  expose: true,
  description: 'Start a new builder conversation.',
  input: BuilderClearInput,
  func: async ({ studioBuilder }, { key, specialist }) => {
    const slot = slotKey(key, specialist)
    await studioBuilder.clear(slot)
    return studioBuilder.state(slot)
  },
})
