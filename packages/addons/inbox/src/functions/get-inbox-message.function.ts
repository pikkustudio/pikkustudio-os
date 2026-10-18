import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { NotFoundError } from '@pikku/core/errors'
import { InboxMessageSchema } from '../lib/schemas.js'
import { assertCanView } from '../lib/access.js'
import { extractHighlights } from '../lib/highlights.js'

export const GetInboxMessageInput = z.object({
  projectKey: z.string().min(1),
  stage: z.string().nullable().default(null),
  id: z.string().min(1),
})

export const getInboxMessage = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  input: GetInboxMessageInput,
  output: InboxMessageSchema,
  func: async ({ inboxStore, inboxAccess }, { projectKey, stage, id }, { session }) => {
    await assertCanView(inboxAccess, session, projectKey)
    const message = await inboxStore.get({ projectKey, stage, id })
    if (!message) {
      throw new NotFoundError('That message is no longer kept. Messages are kept for a week')
    }
    return { ...message, highlights: extractHighlights({ subject: message.subject ?? '', html: message.html ?? '', text: message.body }) }
  },
})
