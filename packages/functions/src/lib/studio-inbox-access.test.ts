import { expect, test } from 'bun:test'
import { studioInboxAccess } from './studio-inbox-access.ts'

const access = studioInboxAccess({
  list: async () => [
    { key: 'mine', cloudProjectId: null },
    { key: 'linked', cloudProjectId: 'c1' },
  ],
})

test('a signed-in user reads the inbox of a project on this Studio, in any worktree', async () => {
  expect(await access.canView({ userId: 'u' }, 'mine')).toBe(true)
  expect(await access.canView({ userId: 'u' }, 'mine.feature')).toBe(true)
  expect(await access.canView({ userId: 'u' }, 'c1')).toBe(true)
})

test('anyone else, or a project this Studio does not hold, is refused', async () => {
  expect(await access.canView({ userId: 'u' }, 'other')).toBe(false)
  expect(await access.canView(undefined, 'mine')).toBe(false)
})
