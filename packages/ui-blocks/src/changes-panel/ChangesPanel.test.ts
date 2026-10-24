import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ago, forPanel, stateOf } from './ChangesPanel'

const c = (id: string, status: string, awaitingApproval = false, createdAt = '2026-10-06T12:00:00Z') => ({ changeId: id, shortId: id, title: id, status, awaitingApproval, createdAt }) as never

test('what needs the person comes first, set-aside changes are hidden', () => {
  const out = forPanel([c('a', 'open'), c('b', 'in_progress'), c('d', 'dismissed'), c('e', 'needs_answer'), c('f', 'open', true)])
  assert.deepEqual(out.map((x) => [x.c.changeId, x.state]), [['e', 'needs'], ['f', 'needs'], ['b', 'working'], ['a', 'waiting']])
})

test('a change that waits for approval needs the person', () => {
  assert.equal(stateOf({ status: 'open', awaitingApproval: true }), 'needs')
  assert.equal(stateOf({ status: 'done' }), 'done')
})

test('time reads as a plain phrase', () => {
  const now = Date.parse('2026-10-06T12:00:00Z')
  assert.equal(ago('2026-10-06T11:48:00Z', now), '12 minutes ago')
  assert.equal(ago('2026-10-04T12:00:00Z', now), '2 days ago')
  assert.equal(ago(null, now), undefined)
})
