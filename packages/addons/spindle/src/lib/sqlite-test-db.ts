import { DatabaseSync } from 'node:sqlite'
import { readFileSync, readdirSync } from 'node:fs'
import {
  Kysely,
  SqliteAdapter,
  SqliteIntrospector,
  SqliteQueryCompiler,
  type CompiledQuery,
  type DatabaseConnection,
  type Driver,
  type QueryResult,
} from 'kysely'
import type { SpindleDb } from './library.js'

class Connection implements DatabaseConnection {
  constructor(private db: DatabaseSync) {}
  async executeQuery<R>(query: CompiledQuery): Promise<QueryResult<R>> {
    const stmt = this.db.prepare(query.sql)
    const params = query.parameters as never[]
    if (/^\s*(select|with|pragma)/i.test(query.sql) || /returning/i.test(query.sql)) {
      return { rows: stmt.all(...params) as R[] }
    }
    const r = stmt.run(...params)
    return { rows: [], numAffectedRows: BigInt(r.changes), insertId: BigInt(r.lastInsertRowid) }
  }
  async *streamQuery(): AsyncIterableIterator<never> {
    throw new Error('streaming is not supported')
  }
}

export const memoryDb = (): Kysely<SpindleDb> => {
  const raw = new DatabaseSync(':memory:')
  raw.exec('pragma foreign_keys = on')
  for (const file of readdirSync(new URL('../../db/sqlite/', import.meta.url)).sort()) {
    raw.exec(readFileSync(new URL(`../../db/sqlite/${file}`, import.meta.url), 'utf8'))
  }
  const conn = new Connection(raw)
  const run = (sql: string) => conn.executeQuery({ sql, parameters: [] } as never)
  const driver: Driver = {
    init: async () => {},
    acquireConnection: async () => conn,
    beginTransaction: async () => void (await run('begin')),
    commitTransaction: async () => void (await run('commit')),
    rollbackTransaction: async () => void (await run('rollback')),
    releaseConnection: async () => {},
    destroy: async () => {},
  }
  return new Kysely<SpindleDb>({
    dialect: {
      createAdapter: () => new SqliteAdapter(),
      createDriver: () => driver,
      createIntrospector: (db) => new SqliteIntrospector(db),
      createQueryCompiler: () => new SqliteQueryCompiler(),
    },
  })
}
