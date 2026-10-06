import { test } from 'node:test'
import assert from 'node:assert/strict'
import { timelineSections } from './ChangesTimeline'

const c = (id: string, groupId: string | null, status: string) => ({ changeId: id, shortId: id, groupId, title: id, body: null, status }) as never

test('changes are grouped by changeset, loose ones wait, dismissed loose ones are hidden', () => {
  const out = timelineSections([c('a', 'g1', 'done'), c('b', null, 'open'), c('d', null, 'dismissed')], [{ groupId: 'g1', title: 'Booking' }, { groupId: 'g2', title: 'Empty' }])
  assert.deepEqual(out.map((s) => [s.title, s.items.map((i) => i.changeId)]), [['Booking', ['a']], ['Waiting its turn', ['b']]])
})
