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
  wire?: string
  source?: 'server' | 'website'
  functionName?: string
  traceId?: string
  tenantOrgId?: string
  tenantUserId?: string
}

/** What a filter can be set to over a window, counted on the server whatever filters are on. */
export interface LogFacets {
  levels: Record<LogLevel, number>
  functions: string[]
  wires: string[]
}

export const facetsOf = (lines: readonly LogLine[]): LogFacets => {
  const levels: Record<LogLevel, number> = { error: 0, warn: 0, info: 0 }
  const functions = new Set<string>()
  const wires = new Set<string>()
  for (const l of lines) {
    levels[l.level] += 1
    if (l.functionName) functions.add(l.functionName)
    if (l.wire) wires.add(l.wire)
  }
  return { levels, functions: [...functions].sort(), wires: [...wires].sort() }
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
  facets?(ctx: SourceContext, options: { since?: string }): Promise<LogFacets>
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
