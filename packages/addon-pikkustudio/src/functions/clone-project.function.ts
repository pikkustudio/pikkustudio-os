import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const CloneProjectInput = z.object({ fabricProjectId: z.string() })

export const cloneProject = pikkuSessionlessFunc({
  expose: true,
  description: 'Bring a Fabric project onto this machine.',
  input: CloneProjectInput,
  func: async ({ studioProjects }, { fabricProjectId }) => studioProjects.clone(fabricProjectId),
})
