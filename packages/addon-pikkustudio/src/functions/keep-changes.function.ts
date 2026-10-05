import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const KeepChangesInput = z.object({ key: z.string() })

export const keepChanges = pikkuSessionlessFunc({
  description: "Keep a project's work.",
  input: KeepChangesInput,
  func: async ({ studioProjects }, { key }) => studioProjects.keepChanges(key),
})
