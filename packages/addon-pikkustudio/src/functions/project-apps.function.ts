import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ProjectAppsInput = z.object({ key: z.string() })

export const projectApps = pikkuSessionlessFunc({
  description: "A project's frontends and where each is served.",
  input: ProjectAppsInput,
  func: async ({ studioProjects }, { key }) => studioProjects.projectApps(key),
})
