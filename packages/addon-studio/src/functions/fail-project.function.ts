import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const FailProjectInput = z.object({ problem: z.string() })

export const failProject = pikkuSessionlessFunc({
  expose: true,
  description: 'End a project run that could not be saved, with the reason.',
  input: FailProjectInput,
  func: async (_services, { problem }) => {
    throw new Error(problem)
  },
})
