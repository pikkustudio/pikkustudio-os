import { createHash, timingSafeEqual } from 'node:crypto'
import { DatabaseSync } from 'node:sqlite'
import type {
  AuditEvent,
  AuditFacets,
  AuditQuery,
  AuditQueryResult,
  AuditService,
} from '@pikku/core/services'

export const hashToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex')

export const sameToken = (a: string, b: string): boolean => {
  const left = Buffer.from(hashToken(a))
  const right = Buffer.from(hashToken(b))
  return left.length === right.length && timingSafeEqual(left, right)
}

export const openVaultDb = (path: string): DatabaseSync => {
  const db = new DatabaseSync(path)
  db.exec('PRAGMA journal_mode = WAL')
  db.exec(`
    create table if not exists vault_secret (
      key text primary key,
      sealed text not null,
      kid text not null,
      version integer not null default 1,
      updated_at text not null
    );
    create table if not exists vault_token (
      hash text primary key,
      name text not null,
      keys text not null,
      created_at text not null
    );
    create table if not exists vault_audit (
      seq integer primary key autoincrement,
      at text not null,
      caller text,
      type text not null,
      key text,
      outcome text,
      prev_hash text not null,
      hash text not null
    );
  `)
  return db
}

export interface TokenRecord {
  name: string
  keys: string[] | '*'
}

export class VaultStore {
  constructor(private db: DatabaseSync) {}

  sealed(key: string): { sealed: string; kid: string } | undefined {
    return this.db.prepare('select sealed, kid from vault_secret where key = ?').get(key) as
      | { sealed: string; kid: string }
      | undefined
  }

  has(key: string): boolean {
    return this.sealed(key) !== undefined
  }

  keys(): string[] {
    return (this.db.prepare('select key from vault_secret order by key').all() as { key: string }[]).map(
      (row) => row.key
    )
  }

  put(key: string, sealed: string, kid: string): void {
    this.db
      .prepare(
        `insert into vault_secret (key, sealed, kid, version, updated_at) values (?, ?, ?, 1, ?)
         on conflict(key) do update set sealed = excluded.sealed, kid = excluded.kid,
         version = vault_secret.version + 1, updated_at = excluded.updated_at`
      )
      .run(key, sealed, kid, new Date().toISOString())
  }

  delete(key: string): boolean {
    return Number(this.db.prepare('delete from vault_secret where key = ?').run(key).changes) > 0
  }

  addToken(token: string, record: TokenRecord): void {
    this.db
      .prepare('insert into vault_token (hash, name, keys, created_at) values (?, ?, ?, ?)')
      .run(hashToken(token), record.name, JSON.stringify(record.keys), new Date().toISOString())
  }

  token(token: string): TokenRecord | undefined {
    const row = this.db
      .prepare('select name, keys from vault_token where hash = ?')
      .get(hashToken(token)) as { name: string; keys: string } | undefined
    return row ? { name: row.name, keys: JSON.parse(row.keys) } : undefined
  }
}

export class SqliteAuditService implements AuditService {
  constructor(private db: DatabaseSync) {}

  async audit(event: AuditEvent): Promise<void> {
    const last = this.db
      .prepare('select hash from vault_audit order by seq desc limit 1')
      .get() as { hash: string } | undefined
    const prev = last?.hash ?? ''
    const key = typeof event.metadata?.key === 'string' ? event.metadata.key : null
    const caller = event.userIdentity?.userId ?? null
    const outcome = event.outcome ?? 'success'
    const hash = createHash('sha256')
      .update([prev, event.occurredAt, caller, event.type, key, outcome].join('\n'))
      .digest('hex')
    this.db
      .prepare(
        'insert into vault_audit (at, caller, type, key, outcome, prev_hash, hash) values (?, ?, ?, ?, ?, ?, ?)'
      )
      .run(event.occurredAt, caller, event.type, key, outcome, prev, hash)
  }

  async query(query: AuditQuery): Promise<AuditQueryResult> {
    const where: string[] = []
    const params: (string | number)[] = []
    const any = (column: string, values?: string[]) => {
      if (!values) return
      where.push(values.length ? `${column} in (${values.map(() => '?').join(',')})` : '0')
      params.push(...values)
    }
    any('caller', query.userIds)
    any('type', query.types)
    if (query.from) {
      where.push('at >= ?')
      params.push(query.from)
    }
    if (query.to) {
      where.push('at < ?')
      params.push(query.to)
    }
    const limit = query.limit ?? 50
    const offset = query.offset ?? 0
    const rows = this.db
      .prepare(
        `select at, caller, type, key, outcome from vault_audit
         ${where.length ? `where ${where.join(' and ')}` : ''}
         order by seq desc limit ? offset ?`
      )
      .all(...params, limit + 1, offset) as {
      at: string
      caller: string | null
      type: string
      key: string | null
      outcome: string
    }[]
    const page = rows.slice(0, limit)
    return {
      events: page.map((row) => ({
        type: row.type,
        source: 'explicit' as const,
        outcome: row.outcome as AuditEvent['outcome'],
        occurredAt: row.at,
        userIdentity: row.caller ? { userId: row.caller } : undefined,
        metadata: row.key ? { key: row.key } : undefined,
      })),
      nextCursor: rows.length > limit ? offset + limit : null,
    }
  }

  async facets(): Promise<AuditFacets> {
    const column = (name: string) =>
      (
        this.db.prepare(`select distinct ${name} as v from vault_audit where ${name} is not null`).all() as {
          v: string
        }[]
      ).map((row) => row.v)
    return { userIds: column('caller'), types: column('type') }
  }

  verify(): boolean {
    const rows = this.db
      .prepare('select at, caller, type, key, outcome, prev_hash, hash from vault_audit order by seq')
      .all() as {
      at: string
      caller: string | null
      type: string
      key: string | null
      outcome: string
      prev_hash: string
      hash: string
    }[]
    let prev = ''
    for (const row of rows) {
      const expected = createHash('sha256')
        .update([prev, row.at, row.caller, row.type, row.key, row.outcome].join('\n'))
        .digest('hex')
      if (row.prev_hash !== prev || row.hash !== expected) return false
      prev = row.hash
    }
    return true
  }
}
