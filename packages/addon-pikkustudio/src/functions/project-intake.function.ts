import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectIntakeInput = z.object({ key: z.string() })
export const ProjectIntakeOutput = z.object({
  path: z.enum(['interview', 'design']).nullable(),
  done: z.boolean(),
  idea: z.string().nullable(),
  surfaces: z.array(z.string()),
  devices: z.array(z.string()),
})

export const projectIntake = pikkuSessionlessFunc({
  expose: true,
  description: 'How a project was started and whether its first interview is finished.',
  input: ProjectIntakeInput,
  output: ProjectIntakeOutput,
  func: async ({ studioProjects }, { key }) => {
    const found = await studioProjects.intake(key)
    return found ?? { path: null, done: true, idea: null, surfaces: [], devices: [] }
  },
})

export const FinishIntakeInput = z.object({ key: z.string() })

export const finishIntake = pikkuSessionlessFunc({
  expose: true,
  description: 'Mark the first interview of a project as finished.',
  input: FinishIntakeInput,
  func: async ({ studioProjects }, { key }) => {
    await studioProjects.finishIntake(key)
    return { key }
  },
})
