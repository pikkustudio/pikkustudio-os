import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/addon/function'

export const WorkspaceStatusInput = z.object({ key: z.string() })
export const WorkspaceStatusOutput = z.object({
  state: z.enum(['off', 'starting', 'ready', 'failed']),
  phase: z.enum(['machine', 'studio', 'sync', 'project', 'connect']).nullable(),
  error: z.string().nullable(),
})

export const workspaceStatus = pikkuSessionlessFunc({
  expose: true,
  description: 'Where a cloud project’s workspace stands and how far its start has got. Never starts or wakes it.',
  input: WorkspaceStatusInput,
  output: WorkspaceStatusOutput,
  func: async ({ studioProjects }, { key }) => studioProjects.workspaceStatus(key),
})
