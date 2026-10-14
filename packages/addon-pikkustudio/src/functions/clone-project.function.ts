import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const CloneProjectInput = z.object({ cloudProjectId: z.string() })

export const cloneProject = pikkuSessionlessFunc({
  expose: true,
  description: 'Bring a Pikku Studio Cloud project onto this machine.',
  input: CloneProjectInput,
  func: async ({ studioProjects }, { cloudProjectId }) => studioProjects.clone(cloudProjectId),
})
