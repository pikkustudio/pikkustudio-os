import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { verifyScopes } from '@pikku/core/scope'
import { BadRequestError } from '@pikku/core/errors'
import { reasonById } from '../lib/reasons.js'
import { scopeFor } from '../lib/review-scopes.js'
import { ReviewSubjectSchema, ReviewTargetSchema } from '../lib/schemas.js'

export const CastVerdictInput = ReviewTargetSchema.extend({
  subject: ReviewSubjectSchema,
  kind: z.enum(['keep', 'reject']),
  reasons: z.array(z.string()).max(20).default([]),
  note: z.string().max(2000).nullable().default(null),
})

export const CastVerdictOutput = z.object({
  castUnderScope: z.string(),
})

export const castVerdict = pikkuFunc({
  expose: true,
  auth: true,
  input: CastVerdictInput,
  output: CastVerdictOutput,
  func: async ({ verdictStore }, input, { session }) => {
    const reasons = [...new Set(input.reasons)].map((id) => {
      const reason = reasonById(id)
      if (!reason || reason.subject !== input.subject || reason.kind !== input.kind) {
        throw new BadRequestError(`Unknown ${input.kind} reason for ${input.subject}`)
      }
      return reason.id
    })

    const castUnderScope = scopeFor(input.projectId, input.subject)
    verifyScopes([castUnderScope], session)

    await verdictStore.cast({
      projectId: input.projectId,
      targetKind: input.targetKind,
      targetId: input.targetId,
      contractHash: input.contractHash,
      implementationHash: input.implementationHash,
      subject: input.subject,
      kind: input.kind,
      reasons,
      note: input.note,
      castUnderScope,
      organizationId: session?.orgId ?? null,
      castByUserId: session?.userId ?? null,
      castAt: new Date(),
    })

    return { castUnderScope }
  },
})
