import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const BuilderClearInput = z.object({ key: z.string() })

export const builderClear = pikkuSessionlessFunc({
  expose: true,
  description: 'Start a new builder conversation.',
  input: BuilderClearInput,
  func: async ({ studioBuilder }, { key }) => {
    await studioBuilder.clear(key)
    return studioBuilder.state(key)
  },
})
