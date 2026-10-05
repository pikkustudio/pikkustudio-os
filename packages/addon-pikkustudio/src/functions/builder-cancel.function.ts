import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const BuilderCancelInput = z.object({ key: z.string() })

export const builderCancel = pikkuSessionlessFunc({
  description: 'Stop what the builder is doing.',
  input: BuilderCancelInput,
  func: async ({ studioBuilder }, { key }) => {
    studioBuilder.cancel(key)
    return studioBuilder.state(key)
  },
})
