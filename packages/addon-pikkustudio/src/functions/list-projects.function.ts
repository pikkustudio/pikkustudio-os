import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ListProjectsInput = z.object({})

export const listProjects = pikkuSessionlessFunc({
  description: 'Every project Studio knows, local and in Fabric.',
  input: ListProjectsInput,
  func: async ({ studioProjects, studioHooks }) => ({
    projects: (await studioProjects.list()).map((project) => studioHooks.decorate(project)),
  }),
})
