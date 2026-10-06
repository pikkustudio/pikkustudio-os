import { z } from 'zod'

export const ReviewSubjectSchema = z.enum(['code', 'knowledge', 'ui'])

export const TargetKindSchema = z.enum([
  'function',
  'workflow',
  'agent',
  'queue',
  'knowledge',
  'component',
  'hook',
  'context',
])

export const ReviewTargetSchema = z.object({
  projectId: z.string().nullable(),
  targetKind: TargetKindSchema,
  targetId: z.string(),
  contractHash: z.string().nullable(),
  implementationHash: z.string().nullable(),
})

export const ScoreComponentSchema = z.object({
  label: z.string(),
  points: z.number(),
})

export const UiFactsSchema = z.object({
  unit: z.enum(['component', 'hook', 'context']),
  lines: z.number(),
  hooks: z.array(z.string()),
  rpcs: z.array(z.string()),
})

export const CandidateSchema = z.object({
  clusterId: z.string(),
  targetKind: TargetKindSchema,
  pikkuFuncId: z.string(),
  name: z.string(),
  sourceFile: z.string(),
  bodyStart: z.number(),
  bodyEnd: z.number(),
  contractHash: z.string().nullable(),
  implementationHash: z.string().nullable(),
  services: z.array(z.string()),
  wires: z.array(z.string()),
  change: z.enum(['added', 'contract', 'implementation', 'removed']).nullable(),
  score: z.number(),
  components: z.array(ScoreComponentSchema),
  clusterSize: z.number(),
  members: z.array(z.string()),
  suggestedReasons: z.array(z.string()),
  judgedAs: z.enum(['keep', 'reject']).nullable(),
  commentCount: z.number(),
  ui: UiFactsSchema.nullable(),
})

export const ReviewCommentSchema = ReviewTargetSchema.extend({
  commentId: z.string(),
  subject: ReviewSubjectSchema,
  sourceFile: z.string(),
  lineStart: z.number(),
  lineEnd: z.number(),
  body: z.string(),
  castByUserId: z.string().nullable(),
  castAt: z.date(),
})

export const ReviewReasonSchema = z.object({
  id: z.string(),
  label: z.string(),
  quick: z.string().optional(),
  subject: ReviewSubjectSchema,
  kind: z.enum(['keep', 'reject']),
  tier: z.enum(['lint', 'critic', 'human']),
  lintKey: z.string().optional(),
  guidance: z.string().optional(),
  check: z.string().optional(),
})

export const ReviewFixSchema = z.object({
  target: ReviewTargetSchema,
  commentId: z.string().nullable(),
  name: z.string(),
  reason: z.string(),
  label: z.string(),
  tier: z.enum(['lint', 'critic', 'human']),
  note: z.string().nullable(),
  guidance: z.string().nullable(),
  prompt: z.string(),
  sourceFile: z.string().nullable(),
  bodyStart: z.number().nullable(),
  bodyEnd: z.number().nullable(),
  stale: z.boolean(),
  castAt: z.date(),
})
