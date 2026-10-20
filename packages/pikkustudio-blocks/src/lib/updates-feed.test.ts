import { expect, test } from 'bun:test'
import { changeEvent, groupByDay, mergeFeed, phraseFor, projectEvent, studioEvent, subjectOf, vaultEvent } from './updates-feed.ts'

const now = new Date('2026-10-10T15:00:00').getTime()
const at = (d: string) => new Date(d).toISOString()

test('known action names map to a phrase, namespaced or not', () => {
  expect(phraseFor('createUser')).toBe('create_user')
  expect(phraseFor('admin:flagSetEnabled')).toBe('switch')
  expect(phraseFor('secret.write')).toBe('secret_write')
})

test('an unknown action falls back and never leaks internals', () => {
  expect(phraseFor('billing:rebuildLedgerShard')).toBe('unknown')
  expect(subjectOf({ resource: 'orders' })).toBe('orders')
  expect(subjectOf({ resource: '3f9c1a52-77aa-4c1e-9f0e-1b2c3d4e5f60', key: 'rpc:doThing', name: '{"a":1}' })).toBeNull()
})

test('actors: a known person by name, an unknown id as Pikku, vault admin as you', () => {
  const named = projectEvent({ type: 'createUser', occurredAt: at('2026-10-10T09:00:00'), userIdentity: { userId: 'u1' } }, { u1: { name: 'Maya' } })
  expect(named.actor).toEqual({ kind: 'person', name: 'Maya' })
  const anon = projectEvent({ type: 'createUser', occurredAt: at('2026-10-10T09:00:00') }, undefined)
  expect(anon.actor).toEqual({ kind: 'pikku' })
  expect(vaultEvent({ at: at('2026-10-10T09:00:00'), who: 'admin', action: 'secret.write', key: 'STRIPE', outcome: 'success' }, 0).actor).toEqual({ kind: 'you' })
  expect(vaultEvent({ at: at('2026-10-10T09:00:00'), who: 'project:abc', action: 'secret.read', key: 'STRIPE', outcome: 'denied' }, 0)).toMatchObject({ actor: { kind: 'app' }, outcome: 'warn' })
})

test('failed outcomes are marked', () => {
  expect(projectEvent({ type: 'removeUser', occurredAt: at('2026-10-10T09:00:00'), outcome: 'failed' }, undefined).outcome).toBe('bad')
})

test('changes become sentences by status and dismissed ones vanish', () => {
  expect(changeEvent({ changeId: 'c1', title: 'Booking page', status: 'open', createdAt: at('2026-10-10T09:00:00') })).toMatchObject({ phrase: 'change_asked', actor: { kind: 'you' } })
  expect(changeEvent({ changeId: 'c1', title: 'Booking page', status: 'done', createdAt: at('2026-10-09T09:00:00'), updatedAt: at('2026-10-10T08:00:00') })).toMatchObject({ phrase: 'change_done', at: at('2026-10-10T08:00:00') })
  expect(changeEvent({ changeId: 'c2', title: 'x', status: 'dismissed', createdAt: at('2026-10-10T09:00:00') })).toBeNull()
})

test('the feed is newest first and grouped by day', () => {
  const a = vaultEvent({ at: at('2026-10-10T09:00:00'), who: 'admin', action: 'secret.read', key: null, outcome: 'success' }, 0)
  const b = vaultEvent({ at: at('2026-10-09T20:00:00'), who: 'admin', action: 'secret.read', key: null, outcome: 'success' }, 1)
  const c = vaultEvent({ at: at('2026-10-01T20:00:00'), who: 'admin', action: 'secret.read', key: null, outcome: 'success' }, 2)
  const merged = mergeFeed([c, a], [b])
  expect(merged.map((i) => i.id)).toEqual([a.id, b.id, c.id])
  expect(groupByDay(merged, now).map(([g, l]) => [g, l.length])).toEqual([['today', 1], ['yesterday', 1], ['earlier', 1]])
  expect(groupByDay([], now)).toEqual([])
})

test('studio events become sentences about you and Pikku', () => {
  const t = at('2026-10-10T09:00:00')
  expect(studioEvent({ at: t, type: 'ai.choose', subject: 'key', project: null, outcome: 'success' }, 0)).toMatchObject({ phrase: 'ai_own', actor: { kind: 'you' } })
  expect(studioEvent({ at: t, type: 'ai.choose', subject: 'account', project: null, outcome: 'success' }, 0).phrase).toBe('ai_hosted')
  expect(studioEvent({ at: t, type: 'account.sign_in', subject: null, project: null, outcome: 'success' }, 0).phrase).toBe('account_sign_in')
  expect(studioEvent({ at: t, type: 'project.publish', subject: null, project: 'p', outcome: 'failed' }, 0)).toMatchObject({ phrase: 'publish', actor: { kind: 'pikku' }, outcome: 'bad' })
  expect(studioEvent({ at: t, type: 'something.new', subject: null, project: null, outcome: 'success' }, 0).phrase).toBe('unknown')
})
