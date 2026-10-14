export type ReviewSubject = 'code' | 'knowledge' | 'ui'

export type VerdictKind = 'keep' | 'reject'

export type ChangeKind = 'added' | 'contract' | 'implementation' | 'removed'

export type TargetKind =
  | 'function'
  | 'workflow'
  | 'agent'
  | 'queue'
  | 'knowledge'
  | 'component'
  | 'hook'
  | 'context'

/**
 * What was reviewed, at the version that was read. The pair is the verdict's
 * identity: the target says which thing, the hashes say which version of it,
 * so a later rewrite makes an old call stale rather than silently current.
 */
export interface ReviewTarget {
  projectId: string | null
  targetKind: TargetKind
  targetId: string
  contractHash: string | null
  implementationHash: string | null
}

export interface ReviewVerdict extends ReviewTarget {
  subject: ReviewSubject
  kind: VerdictKind
  reasons: string[]
  note: string | null
  castUnderScope: string
  organizationId: string | null
  castByUserId: string | null
  castAt: Date
}

/**
 * The seam between the addon and its host. Pikku Studio Cloud backs this with a table
 * carrying org provenance; a standalone repo backs it with a committed file.
 */
export interface VerdictQuery {
  subject: ReviewSubject
  scopes: string[]
  projectId?: string | null
  kind?: VerdictKind
}

export interface VerdictStore {
  list(query: VerdictQuery): Promise<ReviewVerdict[]>
  cast(verdict: ReviewVerdict): Promise<void>
  clear(target: ReviewTarget, scopes: string[]): Promise<void>
}

/**
 * A remark on lines of the body as it was at `implementationHash`. Anchored to
 * line numbers rather than to text, so a rewritten body makes the comment stale
 * instead of silently re-pointing it at unrelated lines.
 */
export interface ReviewComment extends ReviewTarget {
  commentId: string
  subject: ReviewSubject
  sourceFile: string
  lineStart: number
  lineEnd: number
  body: string
  castUnderScope: string
  organizationId: string | null
  castByUserId: string | null
  castAt: Date
}

export interface CommentQuery {
  subject: ReviewSubject
  scopes: string[]
  projectId?: string | null
  targetId?: string
}

export interface CommentStore {
  list(query: CommentQuery): Promise<ReviewComment[]>
  add(comment: ReviewComment): Promise<void>
  remove(commentId: string, scopes: string[]): Promise<boolean>
}

export interface ScoreComponent {
  label: string
  points: number
}

/** What the UI queue shows in place of services and wires. Null for functions. */
export interface UiFacts {
  unit: 'component' | 'hook' | 'context'
  lines: number
  hooks: string[]
  rpcs: string[]
}

export interface Candidate {
  clusterId: string
  targetKind: TargetKind
  pikkuFuncId: string
  name: string
  sourceFile: string
  bodyStart: number
  bodyEnd: number
  contractHash: string | null
  implementationHash: string | null
  services: string[]
  wires: string[]
  change: ChangeKind | null
  score: number
  components: ScoreComponent[]
  clusterSize: number
  members: string[]
  suggestedReasons: string[]
  judgedAs: VerdictKind | null
  commentCount: number
  ui: UiFacts | null
}

export const SERVICES_OVERREACH = 5

export interface ScoreWeights {
  perService: number
  serviceCap: number
  perWire: number
  workflowQueued: number
  workflowRetries: number
  workflowTimeout: number
  scenarioStep: number
  mcp: number
  deployServer: number
  perScope: number
  perPermission: number
  permissionsInBody: number
  openSurface: number
  audit: number
  perMiddleware: number
  perExtraInstance: number
  clusterCap: number
  plumbingPenalty: number
  judgedDecay: number
  changeAdded: number
  changeContract: number
  changeImplementation: number
  perErrorRatePoint: number
  errorRateCap: number
  slowMs: number
  slowCap: number
  neverRun: number
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  perService: 4,
  serviceCap: 8,
  perWire: 5,
  workflowQueued: 18,
  workflowRetries: 6,
  workflowTimeout: 4,
  scenarioStep: 8,
  mcp: 10,
  deployServer: 8,
  perScope: 9,
  perPermission: 7,
  permissionsInBody: 12,
  openSurface: 22,
  audit: 6,
  perMiddleware: 3,
  perExtraInstance: 3,
  clusterCap: 18,
  plumbingPenalty: -25,
  judgedDecay: -1000,
  changeAdded: 20,
  changeContract: 26,
  changeImplementation: 10,
  perErrorRatePoint: 1.2,
  errorRateCap: 60,
  slowMs: 400,
  slowCap: 24,
  neverRun: -8,
}

export const PLUMBING_SERVICES = new Set(['kysely', 'logger', 'config', 'variables'])
