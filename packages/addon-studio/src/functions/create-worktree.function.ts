import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const CreateWorktreeInput = z.object(({ key: z.string(), name: z.string() }))

export const createWorktree = pikkuSessionlessFunc({
  expose: true,
  description: "Start a worktree from develop.",
  input: CreateWorktreeInput,
  func: async ({ studioProjects }, { key, name }) => studioProjects.createWorktree(key, name),
})
