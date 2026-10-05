import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const RemoveProjectInput = z.object({ key: z.string() })

export const removeProject = pikkuSessionlessFunc({
  expose: true,
  description: 'Forget a project. Its folder is left alone.',
  input: RemoveProjectInput,
  func: async ({ studioProjects, studioHooks }, { key }) => {
    await studioProjects.remove(key)
    studioHooks.changed()
  },
})
