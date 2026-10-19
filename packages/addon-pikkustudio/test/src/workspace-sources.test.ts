import assert from 'node:assert'
import { readFileSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { test } from 'node:test'
import { createSqliteKysely } from '../../../../node_modules/@pikku/cli/dist/src/functions/db/sqlite/sqlite-kysely.js'
import { kyselyLogStore } from '../../src/services/log-store.js'
import { kyselyLogSource } from '../../src/services/workspace-sources.js'
import type { NewMetricEntry } from '../../src/services/metric-store.js'

const open = () => {
  const database = new DatabaseSync(':memory:')
  for (const file of ['0010-studio-log.sql', '0012-studio-metric.sql', '0018-log-tenant.sql'])
    database.exec(readFileSync(new URL(`../../../../db/sqlite/${file}`, import.meta.url), 'utf8'))
  return createSqliteKysely<any>({ db: database as never, camelCase: true })
}

const ctx = { key: 'k1', target: { kind: 'workspace' as const, name: 'local' } }

const line = (at: number, level: 'error' | 'warn' | 'info', text: string, extra: Record<string, unknown> = {}) => ({ at, level, source: 'server', wire: 'http', fn: 'getTodos', ms: 12, trace: null, text, ...extra })

const call = (at: number, wireId: string, durationMs: number, error?: string): NewMetricEntry => ({
  at, run: 'r', source: 'dev', kind: 'invocation', wireType: 'http', wireId, trace: null, outcome: error ? 'error' : 'success', durationMs, functionMs: null,
  httpMethod: null, httpPath: null, httpStatus: null, errorName: null, errorMessage: error ?? null, tenantUserId: null, tenantOrgId: null,
  command: null, cpuUsageUs: null, cpuPct: null, memMb: null, heapMb: null, loopLagMs: null,
})

test('lists lines newest first and filters on the server', async () => {
  const db = open()
  await kyselyLogStore(db).append('k1', [
    line(1000, 'info', 'started'),
    line(2000, 'error', 'boom 100%', { tenantOrgId: 'o1', trace: 't1' }),
    line(3000, 'warn', 'slow', { fn: 'listUsers' }),
  ])
  await kyselyLogStore(db).append('other', [line(4000, 'error', 'not mine')])
  const source = kyselyLogSource(db)
  const all = await source.list(ctx, {})
  assert.deepStrictEqual(all.map((l) => l.message), ['slow', 'boom 100%', 'started'])
  assert.strictEqual(all[1]!.timestamp, new Date(2000).toISOString())
  assert.deepStrictEqual([all[1]!.functionName, all[1]!.wire, all[1]!.ms, all[1]!.traceId, all[1]!.tenantOrgId], ['getTodos', 'http', 12, 't1', 'o1'])
  assert.deepStrictEqual((await source.list(ctx, { level: 'error' })).map((l) => l.message), ['boom 100%'])
  assert.deepStrictEqual((await source.list(ctx, { search: '100%' })).map((l) => l.message), ['boom 100%'])
  assert.deepStrictEqual((await source.list(ctx, { search: '0%x' })).length, 0)
  assert.deepStrictEqual((await source.list(ctx, { functionName: 'listUsers' })).map((l) => l.message), ['slow'])
  assert.deepStrictEqual((await source.list(ctx, { tenantOrgId: 'o1' })).length, 1)
  assert.deepStrictEqual((await source.list(ctx, { traceId: 't1' })).length, 1)
  assert.deepStrictEqual((await source.list(ctx, { since: new Date(1500).toISOString() })).map((l) => l.message), ['slow', 'boom 100%'])
  assert.deepStrictEqual((await source.list(ctx, { limit: 1 })).map((l) => l.message), ['slow'])
})

test('summarises calls into totals, traffic and functions, and groups what failed', async () => {
  const db = open()
  await kyselyLogStore(db).append('k1', [], undefined, [
    call(0, 'GET:/todos', 100),
    call(10, 'GET:/todos', 300, 'Nope\n  at x'),
    call(60, 'POST:/todos', 50, 'Nope\n  at y'),
    call(70, 'POST:/todos', 50, 'Other'),
  ])
  const source = kyselyLogSource(db)
  const summary = await source.summary(ctx, { since: 0, until: 100, buckets: 2 })
  assert.deepStrictEqual(summary.totals, { requests: 4, errors: 3, avgMs: 125, maxMs: 300 })
  assert.deepStrictEqual(summary.traffic, [
    { at: 0, requests: 2, errors: 1, avgMs: 200, maxMs: 300 },
    { at: 50, requests: 2, errors: 2, avgMs: 50, maxMs: 50 },
  ])
  assert.deepStrictEqual(summary.functions.sort((a, b) => a.name.localeCompare(b.name)), [
    { name: 'GET:/todos', wire: 'http', requests: 2, errors: 1, avgMs: 200, lastRun: 10 },
    { name: 'POST:/todos', wire: 'http', requests: 2, errors: 2, avgMs: 50, lastRun: 70 },
  ])
  const failures = await source.failures(ctx, { since: 0 })
  assert.deepStrictEqual(failures, [
    { functionName: 'POST:/todos', wire: 'http', message: 'Other', count: 1, last: 70 },
    { functionName: 'POST:/todos', wire: 'http', message: 'Nope', count: 1, last: 60 },
    { functionName: 'GET:/todos', wire: 'http', message: 'Nope', count: 1, last: 10 },
  ])
  assert.deepStrictEqual((await source.summary({ ...ctx, key: 'none' }, { since: 0, until: 100 })).totals, { requests: 0, errors: 0, avgMs: null, maxMs: null })
})
