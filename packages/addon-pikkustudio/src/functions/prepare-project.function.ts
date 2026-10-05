import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const PrepareProjectInput = z.object({ key: z.string() })

export const prepareProject = pikkuSessionlessFunc({
  expose: true,
  description: "Set up a project's workspace and install what it needs.",
  input: PrepareProjectInput,
  func: async ({ studioProjects }, { key }) => {
    await studioProjects.prepare(key)
    return { key }
  },
})
