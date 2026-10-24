import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectCascadeInput = z.object({ key: z.string(), kind: z.enum(['dev', 'ci']).optional() })

export const ProjectCascadeOutput = z.array(z.object({ name: z.string(), scope: z.string(), source: z.string() }))

export const projectCascade = pikkuSessionlessFunc({
  expose: true,
  description: 'Which scope and source each of a project\'s values comes from for a dev or CI run. Never the values.',
  input: ProjectCascadeInput,
  output: ProjectCascadeOutput,
  func: async ({ studioProjects }, { key, kind }) => studioProjects.cascade(key, kind),
})
