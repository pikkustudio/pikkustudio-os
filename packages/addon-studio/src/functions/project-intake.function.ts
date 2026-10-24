import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectIntakeInput = z.object({ key: z.string() })
export const ProjectIntakeOutput = z.object({
  path: z.enum(['interview', 'design']).nullable(),
  done: z.boolean(),
  idea: z.string().nullable(),
  surfaces: z.array(z.string()),
  devices: z.array(z.string()),
  answers: z.array(z.object({ question: z.string(), answer: z.string(), skipped: z.boolean() })),
  skipped: z.array(z.string()),
  run: z.object({ id: z.string(), at: z.number() }).nullable(),
  jobs: z.record(z.string(), z.number()),
  samples: z.boolean(),
})

export const projectIntake = pikkuSessionlessFunc({
  expose: true,
  description: 'How a project was started and whether its first interview is finished.',
  input: ProjectIntakeInput,
  output: ProjectIntakeOutput,
  func: async ({ studioProjects }, { key }) => {
    const found = await studioProjects.intake(key)
    return found ?? { path: null, done: true, idea: null, surfaces: [], devices: [], answers: [], skipped: [], run: null, jobs: {}, samples: false }
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

export const BeginIntakeInput = z.object({ key: z.string(), idea: z.string().optional(), surfaces: z.array(z.string()).optional(), devices: z.array(z.string()).optional(), path: z.enum(['interview', 'design']).optional() })

export const beginIntake = pikkuSessionlessFunc({
  description: 'Start the first interview of a project that already exists, from an idea.',
  input: BeginIntakeInput,
  func: async ({ studioProjects }, { key, ...start }) => {
    await studioProjects.beginIntake(key, start)
    return { key }
  },
})
