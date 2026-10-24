import assert from 'node:assert'
import { describe, test } from 'node:test'
import { readMockPlan } from '../../src/services/mock-plan.js'

const runner = (diff: unknown) => async () => JSON.stringify(diff)
const scenarios = async (_cwd: string, rpc: string) => (rpc === 'a:list' ? ['empty', 'healthy'] : [])

describe('readMockPlan', () => {
  test('lists added, changed and invalid from the diff and skips ok and removed', async () => {
    const plan = await readMockPlan('/p', runner({ rpcs: [
      { rpc: 'a:list', status: 'added' },
      { rpc: 'b:get', status: 'changed', changes: [{ path: 'title', kind: 'retyped', mock: ['string'], fn: ['number'] }] },
      { rpc: 'c:set', status: 'changed', unsynced: true },
      { rpc: 'd:x', status: 'invalid', problems: ['two defaults'] },
      { rpc: 'e:y', status: 'ok' },
      { rpc: 'f:z', status: 'removed' },
    ] }), scenarios)
    assert.equal(plan.available, true)
    assert.deepEqual(plan.added, [{ rpc: 'a:list', scenarios: ['empty', 'healthy'] }])
    assert.deepEqual(plan.changed.map((c) => c.rpc), ['b:get', 'c:set'])
    assert.match(plan.changed[0]!.reason, /"title" is string in the sample data but number/)
    assert.deepEqual(plan.invalid, [{ rpc: 'd:x', reason: 'two defaults' }])
  })

  test('nothing to make real is available with empty lists', async () => {
    const plan = await readMockPlan('/p', runner({ rpcs: [] }), scenarios)
    assert.deepEqual(plan, { available: true, added: [], changed: [], invalid: [] })
  })

  test('unreadable output means unavailable', async () => {
    const plan = await readMockPlan('/p', async () => 'Usage: pikku <command>', scenarios)
    assert.equal(plan.available, false)
  })
})
