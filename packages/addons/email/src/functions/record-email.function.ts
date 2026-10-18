import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { ForbiddenError } from '@pikku/core/errors'
import { RecordedEmailSchema } from '../lib/schemas.js'
import { verifyInboxToken } from '../lib/token.js'

export const RecordEmailInput = z.object({
  token: z.string().min(1),
  message: RecordedEmailSchema,
})

export const RecordEmailOutput = z.object({
  id: z.string(),
})

export const recordEmail = pikkuFunc({
  expose: true,
  auth: false,
  input: RecordEmailInput,
  output: RecordEmailOutput,
  func: async ({ inboxStore, inboxSecret }, { token, message }) => {
    if (!inboxSecret) {
      throw new ForbiddenError('This Studio is not set up to keep sent emails')
    }
    const claims = verifyInboxToken({ secret: inboxSecret, token })
    if (!claims) {
      throw new ForbiddenError('This app is not allowed to hand emails to Studio. Restart it from Studio and try again')
    }
    const id = crypto.randomUUID()
    await inboxStore.add({
      id,
      projectKey: claims.projectKey,
      stage: claims.stage,
      from: message.from,
      to: message.to,
      cc: message.cc,
      bcc: message.bcc,
      subject: message.subject,
      html: message.html,
      text: message.text,
      templateName: message.templateName,
      templateLocale: message.templateLocale,
      status: 'captured',
      deployRef: message.deployRef,
      createdAt: new Date(),
    })
    return { id }
  },
})
