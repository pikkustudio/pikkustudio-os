import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'

export type ReviewSubject = 'code' | 'ui'
export type VerdictKind = 'keep' | 'reject'
export type Tier = 'lint' | 'critic' | 'human'

export type ReviewTarget = {
  projectId: string | null
  targetKind: string
  targetId: string
  contractHash: string | null
  implementationHash: string | null
}

export type Candidate = {
  pikkuFuncId: string
  targetKind: string
  name: string
  sourceFile: string
  bodyStart: number
  bodyEnd: number
  contractHash: string | null
  implementationHash: string | null
  services: string[]
  wires: string[]
  change: 'added' | 'contract' | 'implementation' | 'removed' | null
  score: number
  suggestedReasons: string[]
  judgedAs: VerdictKind | null
  commentCount: number
}

export type Reason = { id: string; label: string; quick?: string; subject: string; kind: VerdictKind; tier: Tier; guidance?: string }

export type ReviewComment = ReviewTarget & { commentId: string; sourceFile: string; lineStart: number; lineEnd: number; body: string; castAt: string | Date }

export type Queue = { candidates: Candidate[]; comments: ReviewComment[]; reasons: Reason[]; total: number; judged: number }

export type Fix = {
  target: ReviewTarget
  commentId: string | null
  name: string
  reason: string
  label: string
  tier: Tier
  note: string | null
  guidance: string | null
  prompt: string
  sourceFile: string | null
  bodyStart: number | null
  bodyEnd: number | null
  stale: boolean
  castAt: string | Date
}

export type Fixes = { fixes: Fix[]; total: number; stale: number }

/** Hosted projects are keyed `cloud:<id>`; Fabric knows them by the bare id. Local ones use their own key. */
export const reviewProjectId = (key: string) => (key.startsWith('cloud:') ? key.slice('cloud:'.length) : key)

export const candidateKey = (c: Pick<Candidate, 'pikkuFuncId' | 'implementationHash'>) => `${c.pikkuFuncId}\u0000${c.implementationHash ?? ''}`

export const targetOf = (projectId: string, c: Candidate): ReviewTarget => ({
  projectId,
  targetKind: c.targetKind,
  targetId: c.pikkuFuncId,
  contractHash: c.contractHash,
  implementationHash: c.implementationHash,
})

/** The path inside the project, whatever machine the build ran on. */
export const projectPath = (file: string) => {
  const at = file.indexOf('/workspace/project/')
  if (at >= 0) return file.slice(at + '/workspace/project/'.length)
  const pk = file.indexOf('/packages/')
  if (pk >= 0) return file.slice(pk + 1)
  return file.replace(/^\.?\//, '')
}

export const statusOf = (error: unknown) => {
  const s = (error as { status?: unknown } | null)?.status
  return typeof s === 'number' ? s : null
}
/** Casting is scope-gated; a refusal is the only way to know. */
export const isForbidden = (error: unknown) => statusOf(error) === 403
/** Nothing has been built yet, so there is nothing to rank. */
export const isNothingBuilt = (error: unknown) => statusOf(error) === 404

export type Risk = 'high' | 'mid' | 'low'
export const riskOf = (score: number, max: number): Risk => (max <= 0 ? 'low' : score >= max * 0.66 ? 'high' : score >= max * 0.33 ? 'mid' : 'low')

type Opts = { enabled?: boolean }

export const useReviewQueue = (projectId: string, subject: ReviewSubject, opts: Opts = {}) =>
  usePikkuQuery('review:getReviewQueue' as never, { projectId, gitSha: null, sinceGitSha: null, subject, limit: 50 } as never, { retry: false, enabled: !!projectId && opts.enabled !== false } as never) as unknown as import('@tanstack/react-query').UseQueryResult<Queue>

export const useReviewFixes = (projectId: string, subject: ReviewSubject, includeStale: boolean) =>
  usePikkuQuery('review:getReviewFixes' as never, { projectId, gitSha: null, subject, targetIds: null, includeStale, limit: 50 } as never, { retry: false, enabled: !!projectId } as never) as unknown as import('@tanstack/react-query').UseQueryResult<Fixes>

type Mut<I, O = unknown> = import('@tanstack/react-query').UseMutationResult<O, Error, I>

export const useCastVerdict = () =>
  usePikkuMutation('review:castVerdict' as never) as unknown as Mut<ReviewTarget & { subject: ReviewSubject; kind: VerdictKind; reasons: string[]; note: string | null }>

export const useClearVerdict = (onSuccess?: () => void) =>
  usePikkuMutation('review:clearVerdict' as never, { onSuccess } as never) as unknown as Mut<ReviewTarget & { subject: ReviewSubject }>

export const useAddComment = () =>
  usePikkuMutation('review:addReviewComment' as never) as unknown as Mut<ReviewTarget & { subject: ReviewSubject; sourceFile: string; lineStart: number; lineEnd: number; body: string }, { comment: ReviewComment }>

export const useDeleteComment = (onSuccess?: () => void) =>
  usePikkuMutation('review:deleteReviewComment' as never, { onSuccess } as never) as unknown as Mut<{ projectId: string; subject: ReviewSubject; commentId: string }>
