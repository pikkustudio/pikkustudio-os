import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const ReapSessionsInput = z.object({
  remove: z.boolean().optional().describe('Actually remove the sessions that pass every check. Without it, only report.'),
  idleDays: z.number().positive().optional().describe('How many days a session must have been left alone. Defaults to 7.'),
})

const SweepEntry = z.object({
  name: z.string(),
  key: z.string(),
  path: z.string(),
  action: z.enum(['removed', 'would-remove', 'kept']),
  reasons: z.array(z.string()),
})

export const ReapSessionsOutput = z.array(z.object({ root: z.string(), dryRun: z.boolean(), entries: z.array(SweepEntry), error: z.string().optional() }))

export const reapSessions = pikkuSessionlessFunc({
  expose: true,
  description: "Report on the builder's finished session worktrees, and with remove: true clear away the ones that are merged, clean, pushed, not running and idle. Never forces.",
  input: ReapSessionsInput,
  output: ReapSessionsOutput,
  func: ({ studioProjects }, { remove, idleDays }) =>
    studioProjects.sweepSessions({ remove: remove === true, idleMs: idleDays ? idleDays * 24 * 60 * 60 * 1000 : undefined }),
})
