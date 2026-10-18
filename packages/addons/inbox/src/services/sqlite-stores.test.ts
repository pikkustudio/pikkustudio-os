import { test, expect } from 'bun:test'
import { readFileSync } from 'node:fs'
import { createBunSqliteKysely } from '@pikku/kysely-bun-sqlite'
import { KyselyInboxStore } from './kysely-inbox.store.js'
import { StudioInboxEmailService } from './studio-inbox-email.service.js'
import { recordMessage } from '../functions/record-message.function.js'
import { listInbox } from '../functions/list-inbox.function.js'
import { getInboxMessage } from '../functions/get-inbox-message.function.js'
import { RecordedMessageSchema } from '../lib/schemas.js'
import { extractHighlights } from '../lib/highlights.js'
import { mintInboxToken, verifyInboxToken } from '../lib/token.js'
import type { DB } from '../db.js'
import type { InboxMessage } from '../lib/types.js'

const open = async () => {
  const kysely = createBunSqliteKysely<DB>({ filename: ':memory:' })
  const sql = readFileSync(new URL('../../db/sqlite/0001-inbox.sql', import.meta.url), 'utf8')
  for (const statement of sql.split(/;\s*\n/).filter((s) => s.trim())) {
    await kysely.executeQuery({ sql: statement, parameters: [], query: { kind: 'RawNode' } } as never)
  }
  return kysely
}

const message = (over: Partial<InboxMessage> = {}): InboxMessage => ({
  id: crypto.randomUUID(),
  projectKey: 'p1',
  stage: null,
  channel: 'email',
  from: 'app@example.com',
  to: ['ada@example.com'],
  cc: [],
  bcc: [],
  subject: 'Sign in',
  html: '<p>Your code is <b>482913</b></p>',
  body: 'Your code is 482913',
  templateName: 'sign-in',
  templateLocale: 'en',
  status: 'captured',
  deployRef: null,
  meta: null,
  createdAt: new Date(),
  ...over,
})

test('emails are listed newest first, scoped by project and stage', async () => {
  const store = new KyselyInboxStore(await open())
  const now = Date.now()
  await store.add(message({ id: 'a', createdAt: new Date(now - 3000) }))
  await store.add(message({ id: 'b', createdAt: new Date(now - 1000) }))
  await store.add(message({ id: 'c', stage: 'feature-x' }))
  await store.add(message({ id: 'd', projectKey: 'p2' }))
  expect((await store.list({ projectKey: 'p1', stage: null, limit: 10 })).map((r) => r.id)).toEqual(['b', 'a'])
  expect((await store.list({ projectKey: 'p1', stage: 'feature-x', limit: 10 })).map((r) => r.id)).toEqual(['c'])
  expect((await store.list({ projectKey: 'p1', limit: 10 })).map((r) => r.id).sort()).toEqual(['a', 'b', 'c'])
  expect((await store.list({ projectKey: 'p2', stage: null, limit: 10 })).map((r) => r.id)).toEqual(['d'])
  expect(await store.get({ projectKey: 'p2', stage: null, id: 'a' })).toBeFalsy()
  const full = await store.get({ projectKey: 'p1', stage: null, id: 'a' })
  expect(full?.to).toEqual(['ada@example.com'])
  expect(full?.html).toContain('482913')
})

test('the channel filter narrows the list and the record defaults to email', async () => {
  const store = new KyselyInboxStore(await open())
  await store.add(message({ id: 'e1' }))
  await store.add(message({ id: 's1', channel: 'sms', subject: null, html: null, to: ['+15550100'], body: 'Your code is 123456', meta: { carrier: 'test' } }))
  expect((await store.list({ projectKey: 'p1', stage: null, limit: 10 })).map((r) => r.id).sort()).toEqual(['e1', 's1'])
  expect((await store.list({ projectKey: 'p1', stage: null, channel: 'sms', limit: 10 })).map((r) => r.id)).toEqual(['s1'])
  expect((await store.list({ projectKey: 'p1', stage: null, channel: 'email', limit: 10 })).map((r) => r.id)).toEqual(['e1'])
  const sms = await store.get({ projectKey: 'p1', stage: null, id: 's1' })
  expect(sms?.subject).toBeNull()
  expect(sms?.meta).toEqual({ carrier: 'test' })
  const parsed = RecordedMessageSchema.parse({ to: ['a@b.c'] })
  expect(parsed.channel).toBe('email')
  expect(RecordedMessageSchema.safeParse({ to: ['a@b.c'], channel: 'fax' }).success).toBe(false)
})

test('rows older than a week are pruned when a new email is stored', async () => {
  const store = new KyselyInboxStore(await open())
  const now = Date.now()
  await store.add(message({ id: 'old', createdAt: new Date(now - 8 * 86400_000) }), new Date(now - 8 * 86400_000))
  await store.add(message({ id: 'fresh' }), new Date(now))
  expect((await store.list({ projectKey: 'p1', stage: null, limit: 10 })).map((r) => r.id)).toEqual(['fresh'])
})

test('a token fixes the project and stage, and a forged one is refused', async () => {
  const { token } = mintInboxToken({ secret: 's', projectKey: 'p1', stage: null })
  expect(verifyInboxToken({ secret: 's', token })).toEqual({ projectKey: 'p1', stage: null })
  expect(verifyInboxToken({ secret: 'other', token })).toBeNull()
  expect(verifyInboxToken({ secret: 's', token: `${token}x` })).toBeNull()
  const expired = mintInboxToken({ secret: 's', projectKey: 'p1', now: 0, ttlSeconds: 1 }).token
  expect(verifyInboxToken({ secret: 's', token: expired })).toBeNull()
})

test('sending through the service records, lists and reads back end to end', async () => {
  const store = new KyselyInboxStore(await open())
  const services = { inboxStore: store, inboxSecret: 'secret', inboxAccess: { canView: async () => true } } as never
  const wire = { session: { userId: 'u1' } } as never
  const { token } = mintInboxToken({ secret: 'secret', projectKey: 'p1', stage: null })
  const sent: unknown[] = []
  const service = new StudioInboxEmailService({
    url: 'http://studio.test/rpc/inbox:recordMessage',
    token,
    fetch: (async (_url: string, init: { body: string }) => {
      sent.push(JSON.parse(init.body))
      const { data } = JSON.parse(init.body)
      const out = await (recordMessage as any).func(services, data, wire)
      return new Response(JSON.stringify(out), { status: 200 })
    }) as never,
  })
  await service.send({ from: 'app@example.com', to: 'ada@example.com', subject: 'Sign in', html: '<a href="https://app.test/verify?t=1">Verify</a>', text: 'Verify' } as never)
  expect(sent).toHaveLength(1)
  const listed = await (listInbox as any).func(services, { projectKey: 'p1', stage: null, limit: 50 }, wire)
  expect(listed.messages).toHaveLength(1)
  expect(listed.messages[0].subject).toBe('Sign in')
  const got = await (getInboxMessage as any).func(services, { projectKey: 'p1', stage: null, id: listed.messages[0].id }, wire)
  expect(got.highlights.primary).toEqual({ kind: 'link', value: 'https://app.test/verify?t=1', label: 'Verify' })
  const other = await (listInbox as any).func(services, { projectKey: 'p2', stage: null, limit: 50 }, wire)
  expect(other.messages).toHaveLength(0)
})

test('a bad token is refused and nothing is stored', async () => {
  const store = new KyselyInboxStore(await open())
  const body = { token: 'nope', message: { to: ['a@b.c'], subject: 's', html: '', body: '' } }
  await expect((recordMessage as any).func({ inboxStore: store, inboxSecret: 'secret' }, body, {})).rejects.toThrow()
  expect(await store.list({ projectKey: 'p1', limit: 10 })).toHaveLength(0)
})

test('a verification code outranks links and years are ignored', () => {
  const h = extractHighlights({ subject: 'Your code', html: '<p>Your verification code is 482 913. Copyright 2026</p><a href="https://x.test/a">Go</a>', text: '' })
  expect(h.primary).toEqual({ kind: 'code', value: '482 913' })
})

test('without an access service nobody can read, and an access service decides per project', async () => {
  const store = new KyselyInboxStore(await open())
  await store.add(message({ projectKey: 'p1' }))
  const wire = { session: { userId: 'u1' } } as never
  const query = { projectKey: 'p1', stage: null, limit: 50 }
  await expect((listInbox as any).func({ inboxStore: store }, query, wire)).rejects.toThrow('Only people on this project')
  const only = { inboxStore: store, inboxAccess: { canView: async (_s: unknown, key: string) => key === 'p1' } } as never
  expect((await (listInbox as any).func(only, query, wire)).messages).toHaveLength(1)
  await expect((listInbox as any).func(only, { ...query, projectKey: 'p2' }, wire)).rejects.toThrow('Only people on this project')
})
