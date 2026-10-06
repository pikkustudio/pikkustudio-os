import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { NotFoundError } from '@pikku/core/errors'
import { buildCommentFixPrompt, buildFixPrompt, type FixLocation } from '../lib/fix-prompt.js'
import { reasonById } from '../lib/reasons.js'
import { readableScopes } from '../lib/review-scopes.js'
import { ReviewFixSchema, ReviewSubjectSchema } from '../lib/schemas.js'
import type { ReviewSubject } from '../lib/types.js'
import type { MetaSource, MetaRef } from '../services/meta-source.interface.js'
import type { UiSource } from '../services/ui-source.interface.js'

export const GetReviewFixesInput = z.object({
  projectId: z.string().nullable().default(null),
  gitSha: z.string().nullable().default(null),
  subject: ReviewSubjectSchema.default('code'),
  targetIds: z.array(z.string()).nullable().default(null),
  includeStale: z.boolean().default(false),
  limit: z.number().min(1).max(200).default(50),
})

export const GetReviewFixesOutput = z.object({
  fixes: z.array(ReviewFixSchema),
  total: z.number(),
  stale: z.number(),
})

export const getReviewFixes = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  input: GetReviewFixesInput,
  output: GetReviewFixesOutput,
  func: async (
    { metaSource, uiSource, verdictStore, commentStore },
    { projectId, gitSha, subject, targetIds, includeStale, limit },
    { session },
  ) => {
    const scopes = readableScopes(session?.scopes, subject)
    const byTargetId = await targetsFor(subject, metaSource, uiSource, { projectId, gitSha })

    const wanted = targetIds ? new Set(targetIds) : null
    const [verdicts, comments] = await Promise.all([
      verdictStore.list({ subject, scopes, projectId, kind: 'reject' }),
      commentStore.list({ subject, scopes, projectId }),
    ])

    const fixes: z.infer<typeof ReviewFixSchema>[] = []
    let stale = 0

    for (const comment of comments) {
      if (wanted && !wanted.has(comment.targetId)) {
        continue
      }
      const entry = byTargetId.get(comment.targetId)
      const isStale = !entry || (entry.implementationHash ?? null) !== comment.implementationHash

      if (isStale) {
        stale += 1
        if (!includeStale) {
          continue
        }
      }

      const name = entry?.name ?? comment.targetId
      const [firstLine] = comment.body.split('\n')

      fixes.push({
        target: {
          projectId: comment.projectId,
          targetKind: comment.targetKind,
          targetId: comment.targetId,
          contractHash: comment.contractHash,
          implementationHash: comment.implementationHash,
        },
        commentId: comment.commentId,
        name,
        reason: 'comment',
        label: firstLine.length > 80 ? `${firstLine.slice(0, 79)}\u2026` : firstLine,
        tier: 'human',
        note: comment.body,
        guidance: null,
        prompt: buildCommentFixPrompt({
          name,
          body: comment.body,
          sourceFile: comment.sourceFile,
          lineStart: comment.lineStart,
          lineEnd: comment.lineEnd,
          stale: isStale,
        }),
        sourceFile: comment.sourceFile,
        bodyStart: comment.lineStart,
        bodyEnd: comment.lineEnd,
        stale: isStale,
        castAt: comment.castAt,
      })
    }

    for (const verdict of verdicts) {
      if (wanted && !wanted.has(verdict.targetId)) {
        continue
      }
      const reasons = verdict.reasons
        .map((id) => reasonById(id))
        .filter((reason) => reason !== undefined)
      if (reasons.length === 0) {
        continue
      }

      const entry = byTargetId.get(verdict.targetId)
      const isStale = !entry || (entry.implementationHash ?? null) !== verdict.implementationHash

      if (isStale) {
        stale += 1
        if (!includeStale) {
          continue
        }
      }

      const location: FixLocation | null = entry?.sourceFile
        ? {
            sourceFile: entry.sourceFile,
            bodyStart: entry.bodyStart ?? 0,
            bodyEnd: entry.bodyEnd ?? 0,
          }
        : null

      const name = entry?.name ?? verdict.targetId

      for (const reason of reasons) {
        fixes.push({
          target: {
            projectId: verdict.projectId,
            targetKind: verdict.targetKind,
            targetId: verdict.targetId,
            contractHash: verdict.contractHash,
            implementationHash: verdict.implementationHash,
          },
          commentId: null,
          name,
          reason: reason.id,
          label: reason.label,
          tier: reason.tier,
          note: verdict.note,
          guidance: reason.guidance ?? null,
          prompt: buildFixPrompt({ name, reason, note: verdict.note, location, stale: isStale }),
          sourceFile: location?.sourceFile ?? null,
          bodyStart: location?.bodyStart ?? null,
          bodyEnd: location?.bodyEnd ?? null,
          stale: isStale,
          castAt: verdict.castAt,
        })
      }
    }

    const fileKey = (fix: (typeof fixes)[number]) => fix.sourceFile ?? '\uffff'
    fixes.sort(
      (a, b) => fileKey(a).localeCompare(fileKey(b)) || (a.bodyStart ?? 0) - (b.bodyStart ?? 0),
    )

    return { fixes: fixes.slice(0, limit), total: fixes.length, stale }
  },
})

interface FixTarget {
  name: string
  sourceFile: string | null
  bodyStart: number
  bodyEnd: number
  implementationHash: string | null
}

const targetsFor = async (
  subject: ReviewSubject,
  metaSource: MetaSource,
  uiSource: UiSource,
  ref: MetaRef,
): Promise<Map<string, FixTarget>> => {
  if (subject === 'ui') {
    const meta = await uiSource.read(ref)
    if (!meta) {
      throw new NotFoundError('No frontend source found for that project and sha')
    }
    return new Map(
      Object.values(meta).map((entry) => [
        entry.uiId,
        {
          name: entry.name,
          sourceFile: entry.sourceFile,
          bodyStart: entry.bodyStart,
          bodyEnd: entry.bodyEnd,
          implementationHash: entry.implementationHash,
        },
      ]),
    )
  }

  const meta = await metaSource.read(ref)
  if (!meta) {
    throw new NotFoundError('No generated meta found for that project and sha')
  }

  const out = new Map<string, FixTarget>()
  for (const [id, entry] of Object.entries(meta as Record<string, any>)) {
    out.set(entry.pikkuFuncId ?? id, {
      name: entry.name ?? id,
      sourceFile: entry.sourceFile ?? null,
      bodyStart: entry.bodyStart ?? 0,
      bodyEnd: entry.bodyEnd ?? 0,
      implementationHash: entry.implementationHash ?? null,
    })
  }
  return out
}
