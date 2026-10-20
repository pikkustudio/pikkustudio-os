import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { onlineIdOf } from '../services/projects.js'

export const ProjectStageAuditInput = z.object({ key: z.string(), limit: z.number().int().min(1).max(200).optional() })

export const ProjectStageAuditOutput = z.object({
  readable: z.boolean(),
  events: z.array(
    z.object({
      eventId: z.string().optional(),
      type: z.string(),
      outcome: z.enum(['success', 'failed', 'denied']).optional(),
      occurredAt: z.string(),
      userIdentity: z.object({ userId: z.string().optional(), pikkuUserId: z.string().optional() }).optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  ),
  users: z.record(z.string(), z.object({ name: z.string().optional(), email: z.string().optional() })),
})

const none = { readable: false, events: [], users: {} }

export const projectStageAudit = pikkuFunc({
  expose: true,
  readonly: true,
  description: "What happened in the project's published app. Not readable where this host sees no published copies, the project is not linked, or nothing is published.",
  input: ProjectStageAuditInput,
  output: ProjectStageAuditOutput,
  func: async ({ stageAudit, studioProjects }, { key, limit }, { session }) => {
    if (!stageAudit) return none
    const cloudProjectId = onlineIdOf(key) ?? ((await studioProjects.list().catch(() => [])).find((p) => p.key === key)?.cloudProjectId ?? null)
    if (!cloudProjectId) return none
    return (await stageAudit.page({ key, session, project: { cloudProjectId } }, { limit: limit ?? 30 })) ?? none
  },
})
