import type { Kysely } from 'kysely'
import { matchesMetric, metricFromRow, metricRow, type MetricEntry, type MetricQuery, type NewMetricEntry } from './metric-store.js'

export type LogLevel = 'error' | 'warn' | 'info'

export interface LogEntry {
  id: number
  at: number
  level: LogLevel
  source: string
  wire: string | null
  fn: string | null
  ms: number | null
  trace: string | null
  tenantOrgId: string | null
  tenantUserId: string | null
  text: string
}

export type NewLogEntry = Omit<LogEntry, 'id' | 'tenantOrgId' | 'tenantUserId'> & { tenantOrgId?: string | null; tenantUserId?: string | null }

/** The collector's side of the log tables: it writes lines and remembers how far it read. Reading for screens goes through a LogSource. */
export interface LogStore {
  append(key: string, entries: NewLogEntry[], cursor?: { file: string; position: number }, metrics?: NewMetricEntry[]): Promise<void>
  position(file: string): Promise<number>
  forget(files: string[]): Promise<void>
  trim(keep: { known: string[]; olderThan: number; perProject: number }): Promise<void>
  metrics(key: string, query?: MetricQuery): Promise<MetricEntry[]>
}

export type MemoryLogStore = LogStore & { list(key: string, options?: { since?: number; limit?: number }): Promise<LogEntry[]> }

export const memoryLogStore = (): MemoryLogStore => {
  const rows = new Map<string, LogEntry[]>()
  const samples = new Map<string, MetricEntry[]>()
  const cursors = new Map<string, number>()
  let next = 1
  return {
    async append(key, entries, cursor, metrics = []) {
      const list = rows.get(key) ?? []
      list.push(...entries.map((e) => ({ ...e, tenantOrgId: e.tenantOrgId ?? null, tenantUserId: e.tenantUserId ?? null, id: next++ })))
      rows.set(key, list.slice(-5000))
      const kept = samples.get(key) ?? []
      kept.push(...metrics.map((m) => ({ ...m, id: next++ })))
      samples.set(key, kept.slice(-20000))
      if (cursor) cursors.set(cursor.file, cursor.position)
    },
    async position(file) {
      return cursors.get(file) ?? 0
    },
    async forget(files) {
      for (const f of files) cursors.delete(f)
    },
    async trim({ known, olderThan, perProject }) {
      for (const [key, list] of rows) {
        if (!known.includes(key)) rows.delete(key)
        else rows.set(key, list.filter((e) => e.at >= olderThan).slice(-perProject))
      }
      for (const [key, list] of samples) {
        if (!known.includes(key)) samples.delete(key)
        else samples.set(key, list.filter((e) => e.at >= olderThan).slice(-perProject))
      }
    },
    async list(key, { since = 0, limit = 500 } = {}) {
      return (rows.get(key) ?? []).filter((e) => e.at >= since).slice(-limit).reverse()
    },
    async metrics(key, query = {}) {
      return (samples.get(key) ?? []).filter((e) => matchesMetric(e, query)).slice(-(query.limit ?? 500)).reverse()
    },
  }
}

const INSERT_CHUNK = 200

export const kyselyLogStore = (db: Kysely<any>): LogStore => ({
  async append(key, entries, cursor, metrics = []) {
    await db.transaction().execute(async (trx) => {
      for (let i = 0; i < metrics.length; i += INSERT_CHUNK)
        await trx.insertInto('metric_entry').values(metrics.slice(i, i + INSERT_CHUNK).map((m) => metricRow(key, m))).execute()
      for (let i = 0; i < entries.length; i += INSERT_CHUNK)
        await trx
          .insertInto('log_entry')
          .values(entries.slice(i, i + INSERT_CHUNK).map((e) => ({ project_id: key, source: e.source, level: e.level, wire: e.wire, fn: e.fn, ms: e.ms, trace: e.trace, tenant_org_id: e.tenantOrgId ?? null, tenant_user_id: e.tenantUserId ?? null, text: e.text, at: e.at })))
          .execute()
      if (cursor)
        await trx
          .insertInto('log_cursor')
          .values({ file: cursor.file, project_id: key, position: cursor.position })
          .onConflict((oc) => oc.column('file').doUpdateSet({ position: cursor.position }))
          .execute()
    })
  },
  async position(file) {
    const row = await db.selectFrom('log_cursor').select('position').where('file', '=', file).executeTakeFirst()
    return Number(row?.position ?? 0)
  },
  async forget(files) {
    if (files.length) await db.deleteFrom('log_cursor').where('file', 'in', files).execute()
  },
  async trim({ known, olderThan, perProject }) {
    await db.deleteFrom('log_entry').where('at', '<', olderThan).execute()
    await db.deleteFrom('metric_entry').where('at', '<', olderThan).execute()
    await db.deleteFrom('metric_entry').where('project_id', 'not in', known.length ? known : ['']).execute()
    await db.deleteFrom('log_cursor').where('project_id', 'not in', known.length ? known : ['']).execute()
    await db.deleteFrom('log_entry').where('project_id', 'not in', known.length ? known : ['']).execute()
    for (const key of known) {
      const edge = await db.selectFrom('log_entry').select('log_id').where('project_id', '=', key).orderBy('log_id', 'desc').offset(perProject).limit(1).executeTakeFirst()
      const id = (edge as { logId?: number; log_id?: number } | undefined)
      const cut = id?.logId ?? id?.log_id
      if (cut) await db.deleteFrom('log_entry').where('project_id', '=', key).where('log_id', '<=', cut).execute()
    }
  },
  async metrics(key, query = {}) {
    let q = db.selectFrom('metric_entry').selectAll().where('project_id', '=', key)
    if (query.since !== undefined) q = q.where('at', '>=', query.since)
    if (query.until !== undefined) q = q.where('at', '<=', query.until)
    if (query.kind) q = q.where('kind', '=', query.kind)
    if (query.run) q = q.where('run', '=', query.run)
    if (query.wireType) q = q.where('wire_type', '=', query.wireType)
    if (query.wireId) q = q.where('wire_id', '=', query.wireId)
    if (query.outcome) q = q.where('outcome', '=', query.outcome)
    if (query.httpStatus !== undefined) q = q.where('http_status', '=', query.httpStatus)
    if (query.minDurationMs !== undefined) q = q.where('duration_ms', '>=', query.minDurationMs)
    const rows = await q.orderBy('at', 'desc').orderBy('metric_id', 'desc').limit(query.limit ?? 500).execute()
    return rows.map((r) => metricFromRow(r as Record<string, unknown>))
  },
})
