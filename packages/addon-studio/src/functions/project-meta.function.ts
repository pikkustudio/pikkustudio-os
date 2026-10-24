import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectMetaInput = z.object({ key: z.string() })

export const ProjectMetaOutput = z.record(z.string(), z.unknown()).nullable()

export const projectMeta = pikkuSessionlessFunc({
  expose: true,
  readonly: true,
  description: "A project's generated function meta, the raw material Review ranks; null before the project is built.",
  input: ProjectMetaInput,
  output: ProjectMetaOutput,
  func: async ({ studioProjects }, { key }) => studioProjects.projectMeta(key),
})
