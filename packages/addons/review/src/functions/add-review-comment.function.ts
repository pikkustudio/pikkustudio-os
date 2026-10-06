import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { verifyScopes } from '@pikku/core/scope'
import { BadRequestError } from '@pikku/core/errors'
import { scopeFor } from '../lib/review-scopes.js'
import { ReviewCommentSchema, ReviewSubjectSchema, ReviewTargetSchema } from '../lib/schemas.js'

export const AddReviewCommentInput = ReviewTargetSchema.extend({
  subject: ReviewSubjectSchema,
  sourceFile: z.string().min(1),
  lineStart: z.number().int().min(1),
  lineEnd: z.number().int().min(1),
  body: z.string().min(1).max(2000),
})

export const AddReviewCommentOutput = z.object({
  comment: ReviewCommentSchema,
})

export const addReviewComment = pikkuFunc({
  expose: true,
  auth: true,
  input: AddReviewCommentInput,
  output: AddReviewCommentOutput,
  func: async ({ commentStore }, input, { session }) => {
    if (input.lineEnd < input.lineStart) {
      throw new BadRequestError('A comment cannot end before it starts')
    }

    const castUnderScope = scopeFor(input.projectId, input.subject)
    verifyScopes([castUnderScope], session)

    const comment = {
      commentId: crypto.randomUUID(),
      projectId: input.projectId,
      targetKind: input.targetKind,
      targetId: input.targetId,
      contractHash: input.contractHash,
      implementationHash: input.implementationHash,
      subject: input.subject,
      sourceFile: input.sourceFile,
      lineStart: input.lineStart,
      lineEnd: input.lineEnd,
      body: input.body.trim(),
      castUnderScope,
      organizationId: session?.orgId ?? null,
      castByUserId: session?.userId ?? null,
      castAt: new Date(),
    }

    await commentStore.add(comment)

    return { comment }
  },
})
