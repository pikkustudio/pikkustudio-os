import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { NotFoundError } from '@pikku/core/errors'
import { InboxEmailSchema } from '../lib/schemas.js'
import { assertCanView } from '../lib/access.js'
import { extractHighlights } from '../lib/highlights.js'

export const GetInboxEmailInput = z.object({
  projectKey: z.string().min(1),
  stage: z.string().nullable().default(null),
  id: z.string().min(1),
})

export const getInboxEmail = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  input: GetInboxEmailInput,
  output: InboxEmailSchema,
  func: async ({ inboxStore, inboxAccess }, { projectKey, stage, id }, { session }) => {
    await assertCanView(inboxAccess, session, projectKey)
    const message = await inboxStore.get({ projectKey, stage, id })
    if (!message) {
      throw new NotFoundError('That email is no longer kept. Emails are kept for a week')
    }
    return { ...message, highlights: extractHighlights(message) }
  },
})
