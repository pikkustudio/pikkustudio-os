import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const PushAllInput = z.object({ key: z.string() })

export const pushAll = pikkuSessionlessFunc({
  description: 'Push every branch of the project (main, the everyday copy and each working copy) to its remote, if it has one.',
  input: PushAllInput,
  output: z.object({ pushed: z.boolean(), remote: z.string(), branches: z.array(z.string()) }),
  func: async ({ studioProjects }, { key }) => studioProjects.pushAll(key),
})
