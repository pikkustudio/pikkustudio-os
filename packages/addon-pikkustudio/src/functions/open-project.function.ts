import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const OpenProjectInput = z.object({ key: z.string() })

export const openProject = pikkuSessionlessFunc({
  description: 'Start a project and return where it is served.',
  input: OpenProjectInput,
  func: async ({ studioProjects, studioHooks }, { key }) => {
    await studioProjects.open(key)
    studioHooks.changed()
    return { serverUrl: `/p/${key}` }
  },
})
