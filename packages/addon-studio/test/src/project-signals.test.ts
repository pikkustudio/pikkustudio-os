import assert from 'node:assert'
import { describe, test } from 'node:test'
import { readSignals } from '../../src/services/project-signals.js'
import { deriveChecklist } from '../../src/lib/project-checklist.js'

const services = () =>
  ({
    projects: {
      intake: async () => null,
      projectDir: async () => {
        throw new Error('Add the project to Studio before opening it')
      },
    },
    builder: { state: async () => ({ busy: false, items: [] }) },
    publisher: { status: () => ({ state: 'idle' }) },
  }) as never

describe('readSignals', () => {
  test('a project a source holds, with no checkout here, stands at the start', async () => {
    const signals = await readSignals(services(), 'cloud:4146cc6e-cb8b-40ee-a1ca-c607af96a07f', null)
    assert.strictEqual(signals.directions.total, 0)
    assert.strictEqual(signals.designed, false)
    assert.strictEqual(signals.samples, 0)
    assert.ok(deriveChecklist(signals).steps.filter((s) => ['frontend', 'backend', 'tests', 'publish'].includes(s.id)).every((s) => s.state === 'not-started'))
  })

  test('a bare key missing from the registry still throws', async () => {
    await assert.rejects(readSignals(services(), '3ffe11d3', null), /Add the project to Studio/)
  })
})
