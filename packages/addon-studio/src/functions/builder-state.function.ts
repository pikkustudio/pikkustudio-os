import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'
import { SPECIALISTS, slotFor } from '@pikkustudio/builder'

export const BuilderStateInput = z.object({ key: z.string(), specialist: z.enum(SPECIALISTS).optional(), agent: z.string().optional() })

export const builderState = pikkuSessionlessFunc({
  expose: true,
  description: "The builder's conversation for a project.",
  input: BuilderStateInput,
  func: async ({ studioBuilder }, { key, specialist, agent }) => studioBuilder.state(slotFor(key, specialist, agent)),
})
