import type { Kysely } from 'kysely'

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
  text: string
}

export type NewLogEntry = Omit<LogEntry, 'id'>

export interface LogStore {
  append(key: string, entries: NewLogEntry[], cursor?: { file: string; position: number }): Promise<void>
  position(file: string): Promise<number>
  forget(files: string[]): Promise<void>
  trim(keep: { known: string[]; olderThan: number; perProject: number }): Promise<void>
  list(key: string, options?: { since?: number; limit?: number }): Promise<LogEntry[]>
}

type Row = {
  log_id?: number
  logId?: number
  source: string
  level: string
  wire: string | null
  fn: string | null
  ms: number | null
  trace: string | null
  text: string
  at: number
}

export const memoryLogStore = (): LogStore => {
  const rows = new Map<string, LogEntry[]>()
  const cursors = new Map<string, number>()
  let next = 1
  return {
    async append(key, entries, cursor) {
      const list = rows.get(key) ?? []
      list.push(...entries.map((e) => ({ ...e, id: next++ })))
      rows.set(key, list.slice(-5000))
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
    },
    async list(key, { since = 0, limit = 500 } = {}) {
      return (rows.get(key) ?? []).filter((e) => e.at >= since).slice(-limit).reverse()
    },
  }
}

export const kyselyLogStore = (db: Kysely<any>): LogStore => ({
  async append(key, entries, cursor) {
    await db.transaction().execute(async (trx) => {
      if (entries.length)
        await trx
          .insertInto('log_entry')
          .values(entries.map((e) => ({ project_id: key, source: e.source, level: e.level, wire: e.wire, fn: e.fn, ms: e.ms, trace: e.trace, text: e.text, at: e.at })))
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
    await db.deleteFrom('log_cursor').where('project_id', 'not in', known.length ? known : ['']).execute()
    await db.deleteFrom('log_entry').where('project_id', 'not in', known.length ? known : ['']).execute()
    for (const key of known) {
      const edge = await db.selectFrom('log_entry').select('log_id').where('project_id', '=', key).orderBy('log_id', 'desc').offset(perProject).limit(1).executeTakeFirst()
      const id = (edge as { logId?: number; log_id?: number } | undefined)
      const cut = id?.logId ?? id?.log_id
      if (cut) await db.deleteFrom('log_entry').where('project_id', '=', key).where('log_id', '<=', cut).execute()
    }
  },
  async list(key, { since = 0, limit = 500 } = {}) {
    const rows = (await db
      .selectFrom('log_entry')
      .selectAll()
      .where('project_id', '=', key)
      .where('at', '>=', since)
      .orderBy('at', 'desc')
      .orderBy('log_id', 'desc')
      .limit(limit)
      .execute()) as Row[]
    return rows.map((r) => ({ id: (r.logId ?? r.log_id) as number, at: Number(r.at), level: r.level as LogLevel, source: r.source, wire: r.wire, fn: r.fn, ms: r.ms === null ? null : Number(r.ms), trace: r.trace, text: r.text }))
  },
})
