import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { verifyScopes } from '@pikku/core/scope'
import { scopeFor } from '../lib/review-scopes.js'
import { ReviewSubjectSchema, ReviewTargetSchema } from '../lib/schemas.js'

export const ClearVerdictInput = ReviewTargetSchema.extend({
  subject: ReviewSubjectSchema,
})

export const ClearVerdictOutput = z.object({
  cleared: z.boolean(),
})

export const clearVerdict = pikkuFunc({
  expose: true,
  auth: true,
  input: ClearVerdictInput,
  output: ClearVerdictOutput,
  func: async ({ verdictStore }, input, { session }) => {
    const scope = scopeFor(input.projectId, input.subject)
    verifyScopes([scope], session)

    await verdictStore.clear(
      {
        projectId: input.projectId,
        targetKind: input.targetKind,
        targetId: input.targetId,
        contractHash: input.contractHash,
        implementationHash: input.implementationHash,
      },
      [scope],
    )

    return { cleared: true }
  },
})
