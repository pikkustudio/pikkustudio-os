import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { NotFoundError } from '@pikku/core/errors'
import { rank, verdictKeyFor } from '../lib/score.js'
import { rankUi } from '../lib/ui-score.js'
import { REVIEW_REASONS } from '../lib/reasons.js'
import { readableScopes } from '../lib/review-scopes.js'
import type { VerdictKind } from '../lib/types.js'
import type { MetaSource } from '../services/meta-source.interface.js'
import type { UiSource } from '../services/ui-source.interface.js'
import type { RuntimeSignals } from '../services/runtime-signals.interface.js'
import {
  CandidateSchema,
  ReviewCommentSchema,
  ReviewReasonSchema,
  ReviewSubjectSchema,
} from '../lib/schemas.js'

export const GetReviewQueueInput = z.object({
  projectId: z.string().nullable().default(null),
  gitSha: z.string().nullable().default(null),
  sinceGitSha: z.string().nullable().default(null),
  subject: ReviewSubjectSchema.default('code'),
  hours: z.number().optional(),
  limit: z.number().min(1).max(200).default(50),
})

export const GetReviewQueueOutput = z.object({
  candidates: z.array(CandidateSchema),
  comments: z.array(ReviewCommentSchema),
  reasons: z.array(ReviewReasonSchema),
  total: z.number(),
  judged: z.number(),
})

export const getReviewQueue = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  input: GetReviewQueueInput,
  output: GetReviewQueueOutput,
  func: async (
    { metaSource, uiSource, runtimeSignals, verdictStore, commentStore },
    { projectId, gitSha, sinceGitSha, subject, hours, limit },
    { session },
  ) => {
    const scopes = readableScopes(session?.scopes, subject)

    const [verdicts, comments] = await Promise.all([
      verdictStore.list({ subject, scopes, projectId }),
      commentStore.list({ subject, scopes, projectId }),
    ])

    const judged = new Map(verdicts.map((verdict) => [verdictKeyFor(verdict), verdict.kind]))
    const commentCounts = new Map<string, number>()
    for (const comment of comments) {
      commentCounts.set(comment.targetId, (commentCounts.get(comment.targetId) ?? 0) + 1)
    }

    const ranked =
      subject === 'ui'
        ? await rankUiQueue(uiSource, { projectId, gitSha, sinceGitSha, judged, commentCounts })
        : await rankCodeQueue(metaSource, runtimeSignals, {
            projectId,
            gitSha,
            sinceGitSha,
            hours,
            judged,
            commentCounts,
          })

    return {
      candidates: ranked.slice(0, limit),
      comments,
      reasons: REVIEW_REASONS.filter((reason) => reason.subject === subject),
      total: ranked.length,
      judged: judged.size,
    }
  },
})

type QueueOptions = {
  projectId: string | null
  gitSha: string | null
  sinceGitSha: string | null
  hours?: number
  judged: Map<string, VerdictKind>
  commentCounts: Map<string, number>
}

const rankCodeQueue = async (
  metaSource: MetaSource,
  runtimeSignals: RuntimeSignals,
  { projectId, gitSha, sinceGitSha, hours, judged, commentCounts }: QueueOptions,
) => {
  const meta = await metaSource.read({ projectId, gitSha })
  if (!meta) {
    throw new NotFoundError('No generated meta found for that project and sha')
  }

  const changedSince = sinceGitSha
    ? ((await metaSource.read({ projectId, gitSha: sinceGitSha })) ?? undefined)
    : undefined

  const signals = await runtimeSignals.read({ projectId, hours })
  return rank(meta, { projectId, judged, commentCounts, changedSince, signals })
}

const rankUiQueue = async (
  uiSource: UiSource,
  { projectId, gitSha, sinceGitSha, judged, commentCounts }: QueueOptions,
) => {
  const meta = await uiSource.read({ projectId, gitSha })
  if (!meta) {
    throw new NotFoundError('No frontend source found for that project and sha')
  }

  const changedSince = sinceGitSha
    ? ((await uiSource.read({ projectId, gitSha: sinceGitSha })) ?? undefined)
    : undefined

  return rankUi(meta, { projectId, judged, commentCounts, changedSince })
}
