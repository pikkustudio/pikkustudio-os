import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const saveWork = pikkuSessionlessFunc({
  expose: true,
  description: "Commit and push the builder's work, before the sandbox sleeps.",
  func: async ({ studioProjects }) => ({ worktrees: await studioProjects.saveWork() }),
})
