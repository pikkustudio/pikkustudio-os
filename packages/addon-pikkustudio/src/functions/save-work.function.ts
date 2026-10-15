import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const SaveWorkOutput = z.object({
  worktrees: z.array(z.object({ branch: z.string(), committed: z.boolean(), pushed: z.boolean(), error: z.string().optional() })),
})

export const saveWork = pikkuSessionlessFunc({
  expose: true,
  description: "Commit and push the builder's work, before the sandbox sleeps.",
  output: SaveWorkOutput,
  func: async ({ studioProjects }) => ({ worktrees: await studioProjects.saveWork() }),
})
