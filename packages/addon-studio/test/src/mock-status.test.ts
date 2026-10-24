import assert from 'node:assert'
import { describe, test } from 'node:test'
import { readMockStatus } from '../../src/services/mock-status.js'

const runner = (check: unknown, diff: unknown) => async (_cwd: string, args: string[]) => JSON.stringify(args[1] === 'check' ? check : diff)

describe('readMockStatus', () => {
  test('splits flagged and unflagged stubs and counts screens', async () => {
    const status = await readMockStatus('/p', runner(
      { calls: [
        { file: 'a.tsx', rpc: 'x', flag: 'f' },
        { file: 'a.tsx', rpc: 'y', problem: 'no-flag' },
        { file: 'b.tsx', rpc: 'z', flag: 'g', problem: 'undeclared-flag' },
      ], dead: ['old'], unused: ['idle'] },
      { rpcs: [{ rpc: 'x', status: 'ok' }, { rpc: 'z', status: 'changed' }] },
    ))
    assert.equal(status.available, true)
    assert.deepEqual(status.flagged.map((s) => s.rpc), ['x', 'z'])
    assert.deepEqual(status.unflagged.map((s) => s.rpc), ['y'])
    assert.deepEqual(status.changed, ['z'])
    assert.deepEqual([status.dead, status.unused, status.screens], [['old'], ['idle'], 2])
  })

  test('unreadable output means unavailable, not an error', async () => {
    const status = await readMockStatus('/p', async () => 'Usage: pikku <command>')
    assert.equal(status.available, false)
  })
})
