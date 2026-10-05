import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const CloseProjectInput = z.object({ key: z.string() })

export const closeProject = pikkuSessionlessFunc({
  expose: true,
  description: 'Stop a running project.',
  input: CloseProjectInput,
  func: async ({ studioProjects, studioHooks }, { key }) => {
    studioProjects.close(key)
    studioHooks.changed()
    return null
  },
})
