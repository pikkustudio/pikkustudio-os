import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ListProjectsInput = z.object({
  /** A team's slug: only its projects. `local` is the projects only on this computer. */
  team: z.string().optional(),
})

export const ListProjectsOutput = z.object({
  projects: z.array(
    z
      .object({
        key: z.string(),
        owner: z.string(),
        slug: z.string(),
        name: z.string(),
        path: z.string().nullable(),
        source: z.string().nullable(),
        sourceId: z.string().nullable(),
        gitRepoUrl: z.string().nullable(),
        current: z.boolean(),
        missing: z.boolean(),
        open: z.boolean(),
        worktrees: z.array(z.string()),
        busy: z.boolean(),
      })
      .passthrough()
  ),
})

export const listProjects = pikkuSessionlessFunc({
  expose: true,
  description: 'Every project Studio knows, local and in Pikku Studio Cloud, or one team\'s.',
  input: ListProjectsInput,
  output: ListProjectsOutput,
  func: async ({ studioProjects, studioHooks, studioBuilder }, { team }) => ({
    projects: (await studioProjects.list(team)).map((project) => ({ ...studioHooks.decorate(project), busy: studioBuilder.isProjectBusy(project.key) })),
  }),
})
