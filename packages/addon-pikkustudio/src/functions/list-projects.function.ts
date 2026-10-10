import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ListProjectsInput = z.object({
  /** A team's slug: only its projects. `local` is the projects only on this computer. */
  team: z.string().optional(),
})

export const listProjects = pikkuSessionlessFunc({
  expose: true,
  description: 'Every project Studio knows, local and in Fabric, or one team\'s.',
  input: ListProjectsInput,
  func: async ({ studioProjects, studioHooks, studioBuilder }, { team }) => ({
    projects: (await studioProjects.list(team)).map((project) => ({ ...studioHooks.decorate(project), busy: studioBuilder.isProjectBusy(project.key) })),
  }),
})
