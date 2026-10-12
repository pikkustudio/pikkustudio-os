import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { SPECIALISTS, slotKey } from '@pikkustudio/builder'

export const BuilderStateInput = z.object({ key: z.string(), specialist: z.enum(SPECIALISTS).optional() })

export const builderState = pikkuSessionlessFunc({
  expose: true,
  description: "The builder's conversation for a project.",
  input: BuilderStateInput,
  func: async ({ studioBuilder }, { key, specialist }) => studioBuilder.state(slotKey(key, specialist)),
})
