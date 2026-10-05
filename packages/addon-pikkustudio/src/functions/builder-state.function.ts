import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const BuilderStateInput = z.object({ key: z.string() })

export const builderState = pikkuSessionlessFunc({
  expose: true,
  description: "The builder's conversation for a project.",
  input: BuilderStateInput,
  func: async ({ studioBuilder }, { key }) => studioBuilder.state(key),
})
