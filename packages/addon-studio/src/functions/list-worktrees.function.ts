import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ListWorktreesInput = z.object(({ key: z.string() }))

export const listWorktrees = pikkuSessionlessFunc({
  expose: true,
  description: "List a project's worktrees.",
  input: ListWorktreesInput,
  func: async ({ studioProjects }, { key }) => studioProjects.worktrees(key),
})
