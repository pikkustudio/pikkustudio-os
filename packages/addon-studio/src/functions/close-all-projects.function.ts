import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const CloseAllProjectsInput = z.object({})

export const closeAllProjects = pikkuSessionlessFunc({
  expose: true,
  description: 'Stop every running project.',
  input: CloseAllProjectsInput,
  func: async ({ studioProjects, studioHooks }) => {
    studioProjects.closeAll()
    studioHooks.changed()
    return null
  },
})
