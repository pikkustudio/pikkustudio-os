import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectUiFilesInput = z.object({ key: z.string() })

export const ProjectUiFilesOutput = z.array(z.object({ path: z.string(), content: z.string() }))

export const projectUiFiles = pikkuSessionlessFunc({
  expose: true,
  readonly: true,
  description: "A project's frontend source files under apps/, the raw material Review scans for screens.",
  input: ProjectUiFilesInput,
  output: ProjectUiFilesOutput,
  func: async ({ studioProjects }, { key }) => studioProjects.projectUiFiles(key),
})
