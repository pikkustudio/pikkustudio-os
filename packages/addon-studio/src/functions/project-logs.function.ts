import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectLogsInput = z.object({ key: z.string() })

export const projectLogs = pikkuSessionlessFunc({
  expose: true,
  description: "A running project's recent output.",
  input: ProjectLogsInput,
  func: async ({ studioProjects }, { key }) => studioProjects.logs(key),
})
