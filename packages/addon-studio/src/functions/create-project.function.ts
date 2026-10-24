import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const CreateProjectInput = z.object({ name: z.string(), idea: z.string().optional(), surfaces: z.array(z.string()).optional(), devices: z.array(z.string()).optional(), path: z.enum(['interview', 'design']).optional() })

export const createProject = pikkuSessionlessFunc({
  expose: true,
  description: 'Create a new project from an idea.',
  input: CreateProjectInput,
  func: async ({ studioProjects }, input) => {
    const made = await studioProjects.create(input)
    if (input.path === 'interview') void studioProjects.open(made.key).catch(() => {})
    return made
  },
})
