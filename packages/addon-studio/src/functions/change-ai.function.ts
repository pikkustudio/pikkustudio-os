import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ChangeAiInput = z.object({})

export const changeAi = pikkuSessionlessFunc({
  expose: true,
  description: 'Forget the AI choice.',
  input: ChangeAiInput,
  func: async ({ studioAi }) => {
    await studioAi.clear()
    return null
  },
})
