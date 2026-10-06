import { test, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createBunSqliteKysely } from '@pikku/kysely-bun-sqlite'
import { KyselyVerdictStore } from './kysely-verdict.store.js'
import { KyselyCommentStore } from './kysely-comment.store.js'
import type { DB } from '../db.js'
import type { ReviewComment, ReviewVerdict } from '../lib/types.js'

const open = async () => {
  const kysely = createBunSqliteKysely<DB>({ filename: ':memory:' })
  const sql = readFileSync(new URL('../../db/sqlite/0001-review.sql', import.meta.url), 'utf8')
  for (const statement of sql.split(/;\s*\n/).filter((s) => s.trim())) {
    await kysely.executeQuery({ sql: statement, parameters: [], query: { kind: 'RawNode' } } as never)
  }
  return kysely
}

const verdict: ReviewVerdict = {
  projectId: 'p1',
  targetKind: 'function',
  targetId: 'doThing',
  contractHash: 'c1',
  implementationHash: 'i1',
  subject: 'code',
  kind: 'keep',
  reasons: ['clear-name'],
  note: null,
  castUnderScope: 'review:project:code',
  organizationId: null,
  castByUserId: null,
  castAt: new Date('2026-01-01T00:00:00Z'),
}

test('a verdict is stored in SQLite, replaced on recast, and cleared', async () => {
  const store = new KyselyVerdictStore(await open())
  const query = { subject: 'code' as const, scopes: ['review:project:code'], projectId: 'p1' }
  await store.cast(verdict)
  await store.cast({ ...verdict, kind: 'reject' })
  const rows = await store.list(query)
  expect(rows).toHaveLength(1)
  expect(rows[0].kind).toBe('reject')
  expect(rows[0].reasons).toEqual(['clear-name'])
  await store.clear(verdict, ['review:project:code'])
  expect(await store.list(query)).toEqual([])
})

test('a comment is stored in SQLite and removed by id', async () => {
  const store = new KyselyCommentStore(await open())
  const comment: ReviewComment = {
    ...verdict,
    commentId: 'c-1',
    sourceFile: 'a.ts',
    lineStart: 3,
    lineEnd: 4,
    body: 'why',
  }
  await store.add(comment)
  const rows = await store.list({ subject: 'code', scopes: ['review:project:code'], projectId: 'p1' })
  expect(rows.map((r) => r.commentId)).toEqual(['c-1'])
  expect(await store.remove('c-1', ['review:project:code'])).toBe(true)
})
