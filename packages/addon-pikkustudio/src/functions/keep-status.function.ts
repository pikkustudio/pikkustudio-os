import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const KeepStatusInput = z.object({ key: z.string() })

export const keepStatus = pikkuSessionlessFunc({
  description: 'Whether a project has work that is not kept yet.',
  input: KeepStatusInput,
  func: async ({ studioProjects }, { key }) => studioProjects.keepStatus(key),
})
