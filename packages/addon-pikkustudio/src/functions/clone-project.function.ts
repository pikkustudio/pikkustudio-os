import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const CloneProjectInput = z.object({ key: z.string() })

export const cloneProject = pikkuSessionlessFunc({
  expose: true,
  description: 'Bring a Pikku Studio Cloud project onto this machine.',
  input: CloneProjectInput,
  func: async ({ studioProjects }, { key }) => studioProjects.clone(key),
})
