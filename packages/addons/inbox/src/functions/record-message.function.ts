import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { ForbiddenError } from '@pikku/core/errors'
import { RecordedMessageSchema } from '../lib/schemas.js'
import { verifyInboxToken } from '../lib/token.js'

export const RecordMessageInput = z.object({
  token: z.string().min(1),
  message: RecordedMessageSchema,
})

export const RecordMessageOutput = z.object({
  id: z.string(),
})

export const recordMessage = pikkuFunc({
  expose: true,
  auth: false,
  input: RecordMessageInput,
  output: RecordMessageOutput,
  func: async ({ inboxStore, inboxSecret }, { token, message }) => {
    if (!inboxSecret) {
      throw new ForbiddenError('This Studio is not set up to keep sent messages')
    }
    const claims = verifyInboxToken({ secret: inboxSecret, token })
    if (!claims) {
      throw new ForbiddenError('This app is not allowed to hand messages to Studio. Restart it from Studio and try again')
    }
    const id = crypto.randomUUID()
    await inboxStore.add({
      id,
      projectKey: claims.projectKey,
      stage: claims.stage,
      channel: message.channel,
      from: message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      html: message.html,
      body: message.body,
      templateName: message.templateName,
      templateLocale: message.templateLocale,
      status: 'captured',
      deployRef: message.deployRef,
      meta: message.meta,
      createdAt: new Date(),
    })
    return { id }
  },
})
