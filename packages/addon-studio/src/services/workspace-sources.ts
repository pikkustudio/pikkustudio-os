import { sql, type Kysely } from 'kysely'
import type { LogLevel } from './log-store.js'
import type { Failure, LogFacets, LogLine, LogSource, MetricSource, MetricsSummary } from './log-source.js'

const MAX_LINES = 2000
const MAX_FAILURES = 50

const escapeLike = (text: string) => text.replace(/[\\%_]/g, (c) => `\\${c}`)

const numberOr = (v: unknown, fallback: number | null) => (v === null || v === undefined ? fallback : Number(v))

const sinceOf = (since: string | undefined) => {
  const at = since ? Date.parse(since) : NaN
  return Number.isFinite(at) ? at : null
}

const firstLine = (text: string | null) => (text ?? '').split('\n')[0]!.trim()

type LineRow = { source: string; level: string; wire: string | null; fn: string | null; ms: number | null; trace: string | null; tenant_org_id?: string | null; tenantOrgId?: string | null; tenant_user_id?: string | null; tenantUserId?: string | null; text: string; at: number }

const lineOf = (r: LineRow): LogLine => ({
  timestamp: new Date(Number(r.at)).toISOString(),
  level: r.level as LogLevel,
  source: r.source,
  functionName: r.fn ?? '',
  message: r.text,
  traceId: r.trace ?? undefined,
  tenantOrgId: r.tenant_org_id ?? r.tenantOrgId ?? null,
  tenantUserId: r.tenant_user_id ?? r.tenantUserId ?? null,
  wire: r.wire,
  ms: r.ms === null ? null : Number(r.ms),
})

/** The logs and metrics this computer's collector wrote for a project, read back for the Logs and Metrics screens. */
export const kyselyLogSource = (db: Kysely<any>): LogSource & MetricSource => ({
  async list({ key }, query) {
    let q = db.selectFrom('log_entry').selectAll().where('project_id', '=', key)
    const since = sinceOf(query.since)
    if (since !== null) q = q.where('at', '>', since)
    if (query.level) q = q.where('level', '=', query.level)
    if (query.wire) q = q.where('wire', '=', query.wire)
    if (query.source) q = q.where('source', query.source === 'server' ? '=' : '!=', 'server')
    if (query.functionName) q = q.where('fn', '=', query.functionName)
    if (query.traceId) q = q.where('trace', '=', query.traceId)
    if (query.tenantOrgId) q = q.where('tenant_org_id', '=', query.tenantOrgId)
    if (query.tenantUserId) q = q.where('tenant_user_id', '=', query.tenantUserId)
    if (query.search) {
      const like = `%${escapeLike(query.search)}%`
      q = q.where(sql<boolean>`(text like ${like} escape '\\' or fn like ${like} escape '\\' or trace like ${like} escape '\\' or wire like ${like} escape '\\')`)
    }
    const rows = (await q
      .orderBy('at', 'desc')
      .orderBy('log_id', 'desc')
      .limit(Math.min(Math.max(1, query.limit ?? 500), MAX_LINES))
      .execute()) as LineRow[]
    return rows.map(lineOf)
  },

  async facets({ key }, { since }) {
    let base = db.selectFrom('log_entry').where('project_id', '=', key)
    const from = sinceOf(since)
    if (from !== null) base = base.where('at', '>', from)
    const levels = (await base.select((eb) => ['level', eb.fn.countAll<number>().as('count')]).groupBy('level').execute()) as { level: string; count: number }[]
    const functions = (await base.select('fn').distinct().where('fn', 'is not', null).where('fn', '!=', '').orderBy('fn').execute()) as { fn: string }[]
    const wires = (await base.select('wire').distinct().where('wire', 'is not', null).where('wire', '!=', '').orderBy('wire').execute()) as { wire: string }[]
    const facets: LogFacets = { levels: { error: 0, warn: 0, info: 0 }, functions: functions.map((r) => r.fn), wires: wires.map((r) => r.wire) }
    for (const r of levels) if (r.level in facets.levels) facets.levels[r.level as LogLevel] = Number(r.count)
    return facets
  },

  async failures({ key }, { since, limit = 6 }) {
    const rows = await db
      .selectFrom('metric_entry')
      .select(['wire_type', 'wire_id', 'error_message'])
      .select((eb) => [eb.fn.countAll<number>().as('count'), eb.fn.max('at').as('last')])
      .where('project_id', '=', key)
      .where('kind', '=', 'invocation')
      .where('outcome', '=', 'error')
      .where('at', '>=', since)
      .groupBy(['wire_type', 'wire_id', 'error_message'])
      .execute()
    const groups = new Map<string, Failure>()
    for (const r of rows as Record<string, unknown>[]) {
      const wire = (r.wire_type ?? r.wireType ?? null) as string | null
      const functionName = String(r.wire_id ?? r.wireId ?? '')
      const message = firstLine((r.error_message ?? r.errorMessage ?? null) as string | null)
      const id = `${wire}\u0000${functionName}\u0000${message}`
      const g = groups.get(id) ?? { functionName, wire, message, count: 0, last: null }
      g.count += Number(r.count)
      g.last = Math.max(g.last ?? 0, Number(r.last))
      groups.set(id, g)
    }
    return [...groups.values()].sort((a, b) => (b.last ?? 0) - (a.last ?? 0)).slice(0, Math.min(limit, MAX_FAILURES))
  },

  async summary({ key }, { since, until, buckets = 40 }) {
    const base = db.selectFrom('metric_entry').where('project_id', '=', key).where('kind', '=', 'invocation').where('at', '>=', since).where('at', '<=', until)
    const errors = sql<number>`sum(case when outcome = 'error' then 1 else 0 end)`
    const totals = (await base
      .select((eb) => [eb.fn.countAll<number>().as('requests'), errors.as('errors'), eb.fn.avg('duration_ms').as('avg_ms'), eb.fn.max('duration_ms').as('max_ms')])
      .executeTakeFirst()) as Record<string, unknown> | undefined
    const size = Math.max(1, Math.ceil((until - since) / Math.max(1, buckets)))
    const bucket = sql<number>`cast((at - ${since}) / ${size} as integer)`
    const traffic = (await base
      .select((eb) => [bucket.as('bucket'), eb.fn.countAll<number>().as('requests'), errors.as('errors'), eb.fn.avg('duration_ms').as('avg_ms'), eb.fn.max('duration_ms').as('max_ms')])
      .groupBy(bucket)
      .orderBy(bucket)
      .execute()) as Record<string, unknown>[]
    const functions = (await base
      .select(['wire_type', 'wire_id'])
      .select((eb) => [eb.fn.countAll<number>().as('requests'), errors.as('errors'), eb.fn.avg('duration_ms').as('avg_ms'), eb.fn.max('at').as('last_run')])
      .groupBy(['wire_type', 'wire_id'])
      .execute()) as Record<string, unknown>[]
    const read = (r: Record<string, unknown> | undefined, column: string) => r?.[column] ?? r?.[column.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())] ?? null
    const summary: MetricsSummary = {
      totals: {
        requests: numberOr(read(totals, 'requests'), 0)!,
        errors: numberOr(read(totals, 'errors'), 0)!,
        avgMs: numberOr(read(totals, 'avg_ms'), null),
        maxMs: numberOr(read(totals, 'max_ms'), null),
      },
      traffic: traffic.map((r) => ({
        at: since + Math.floor(Number(read(r, 'bucket'))) * size,
        requests: numberOr(read(r, 'requests'), 0)!,
        errors: numberOr(read(r, 'errors'), 0)!,
        avgMs: numberOr(read(r, 'avg_ms'), 0)!,
        maxMs: numberOr(read(r, 'max_ms'), 0)!,
      })),
      functions: functions.map((r) => ({
        name: String(read(r, 'wire_id') ?? 'unknown'),
        wire: read(r, 'wire_type') as string | null,
        requests: numberOr(read(r, 'requests'), 0)!,
        errors: numberOr(read(r, 'errors'), 0)!,
        avgMs: numberOr(read(r, 'avg_ms'), null),
        lastRun: numberOr(read(r, 'last_run'), null),
      })),
    }
    return summary
  },
})
