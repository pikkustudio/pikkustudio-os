import { ConflictError } from '@pikku/core/errors'
import type { LogLevel } from './log-store.js'

/** Where a project's logs and metrics are read from: its own workspace on this computer, a cloud sandbox, or a published stage. */
export type SourceKind = 'workspace' | 'sandbox' | 'stage'

export type TargetRef = { kind: 'workspace' | 'stage'; name: string }

export interface SourceContext {
  key: string
  target: TargetRef
  project?: { cloudProjectId?: string | null }
  session?: unknown
}

export interface LogLine {
  timestamp: string
  level: LogLevel
  source?: string
  functionName: string
  message: string
  traceId?: string
  tenantOrgId?: string | null
  tenantUserId?: string | null
  wire: string | null
  ms: number | null
}

export interface LogQuery {
  since?: string
  limit?: number
  level?: LogLevel
  search?: string
  functionName?: string
  traceId?: string
  tenantOrgId?: string
  tenantUserId?: string
}

export interface Failure {
  functionName: string
  wire: string | null
  message: string
  count: number
  last: number | null
}

export interface MetricsTraffic {
  at: number
  requests: number
  errors: number
  avgMs: number
  maxMs: number
}

export interface MetricsFunction {
  name: string
  wire: string | null
  requests: number
  errors: number
  avgMs: number | null
  lastRun: number | null
}

export interface MetricsSummary {
  totals: { requests: number; errors: number; avgMs: number | null; maxMs: number | null }
  traffic: MetricsTraffic[]
  functions: MetricsFunction[]
}

export interface LogSource {
  list(ctx: SourceContext, query: LogQuery): Promise<LogLine[]>
  failures(ctx: SourceContext, options: { since: number; limit?: number }): Promise<Failure[]>
}

export interface MetricSource {
  summary(ctx: SourceContext, options: { since: number; until: number; buckets?: number }): Promise<MetricsSummary>
}

export type LogSources = Partial<Record<SourceKind, LogSource>>
export type MetricSources = Partial<Record<SourceKind, MetricSource>>

export interface StageEntry {
  name: string
  label?: string
  production: boolean
  live: boolean
}

/** The published copies of a project, contributed by whichever host can see them. */
export interface StageDirectory {
  stages(ctx: Omit<SourceContext, 'target'>): Promise<StageEntry[]>
  sandboxes?(ctx: Omit<SourceContext, 'target'>): Promise<StageEntry[]>
}

export const LOCAL_WORKSPACE = 'local'

export const sourceKindOf = (target: TargetRef): SourceKind =>
  target.kind === 'stage' ? 'stage' : target.name === LOCAL_WORKSPACE ? 'workspace' : 'sandbox'

export class TargetNotAvailableError extends ConflictError {
  constructor(kind: SourceKind) {
    super(`No ${kind} source is available here`)
    this.name = 'TargetNotAvailableError'
  }
}
