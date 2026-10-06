import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { verifyScopes } from '@pikku/core/scope'
import { NotFoundError } from '@pikku/core/errors'
import { scopeFor } from '../lib/review-scopes.js'
import { ReviewSubjectSchema } from '../lib/schemas.js'

export const DeleteReviewCommentInput = z.object({
  projectId: z.string().nullable(),
  subject: ReviewSubjectSchema,
  commentId: z.string(),
})

export const DeleteReviewCommentOutput = z.object({
  deleted: z.boolean(),
})

export const deleteReviewComment = pikkuFunc({
  expose: true,
  auth: true,
  input: DeleteReviewCommentInput,
  output: DeleteReviewCommentOutput,
  func: async ({ commentStore }, { projectId, subject, commentId }, { session }) => {
    const scope = scopeFor(projectId, subject)
    verifyScopes([scope], session)

    const deleted = await commentStore.remove(commentId, [scope])
    if (!deleted) {
      throw new NotFoundError('No such comment under this scope')
    }

    return { deleted }
  },
})
