import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { InboxChannelSchema, InboxSummarySchema } from '../lib/schemas.js'
import { assertCanView } from '../lib/access.js'
import { RETENTION_DAYS } from '../lib/types.js'

export const ListInboxInput = z.object({
  projectKey: z.string().min(1),
  stage: z.string().nullable().default(null),
  channel: InboxChannelSchema.optional(),
  limit: z.number().int().min(1).max(200).default(50),
})

export const ListInboxOutput = z.object({
  messages: z.array(InboxSummarySchema),
  retentionDays: z.number(),
})

export const listInbox = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  input: ListInboxInput,
  output: ListInboxOutput,
  func: async ({ inboxStore, inboxAccess }, { projectKey, stage, channel, limit }, { session }) => {
    await assertCanView(inboxAccess, session, projectKey)
    const messages = await inboxStore.list({ projectKey, stage, channel, limit })
    return { messages, retentionDays: RETENTION_DAYS }
  },
})
