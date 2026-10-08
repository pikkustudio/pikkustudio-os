import { test } from 'node:test'
import assert from 'node:assert/strict'
import { timelineSections } from './ChangesTimeline'

const c = (id: string, groupId: string | null, status: string) => ({ changeId: id, shortId: id, groupId, title: id, body: null, status }) as never

test('changes are grouped by changeset, loose ones wait, dismissed loose ones are hidden', () => {
  const out = timelineSections([c('a', 'g1', 'done'), c('b', null, 'open'), c('d', null, 'dismissed')], [{ groupId: 'g1', title: 'Booking' }, { groupId: 'g2', title: 'Empty' }])
  assert.deepEqual(out.map((s) => [s.title, s.items.map((i) => i.changeId)]), [['Booking', ['a']], ['Waiting its turn', ['b']]])
})

import { ago, byWho } from './ChangesTimeline'

test('time reads as a plain phrase', () => {
  const now = Date.parse('2026-10-06T12:00:00Z')
  assert.equal(ago('2026-10-06T11:48:00Z', now), '12 minutes ago')
  assert.equal(ago('2026-10-04T12:00:00Z', now), '2 days ago')
  assert.equal(ago(null, now), undefined)
})

test('the author is the name, else where it was filed from', () => {
  assert.equal(byWho({ createdByName: 'Cleo', source: 'panel' } as never), 'Cleo')
  assert.equal(byWho({ createdByName: null, source: 'system' } as never), 'Found automatically')
})
