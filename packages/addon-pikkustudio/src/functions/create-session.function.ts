import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const CreateSessionInput = z.object({ key: z.string(), name: z.string().optional() })

export const createSession = pikkuSessionlessFunc({
  description: 'Start a session in its own worktree, branched from develop.',
  input: CreateSessionInput,
  func: async ({ studioProjects }, { key, name }) => ({ key: await studioProjects.createSession(key, name) }),
})
