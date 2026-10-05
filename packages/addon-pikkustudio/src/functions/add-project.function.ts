import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const AddProjectInput = z.object({ path: z.string() })

export const addProject = pikkuSessionlessFunc({
  description: 'Add a project folder that is already on this machine.',
  input: AddProjectInput,
  func: async ({ studioProjects }, { path }) => studioProjects.add(path),
})
