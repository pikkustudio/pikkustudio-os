import assert from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { LogCollector } from '../../src/services/log-collector.js'
import { memoryLogStore } from '../../src/services/log-store.js'

let home: string
beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'logs-'))
  mkdirSync(join(home, 'logs', 'k1'), { recursive: true })
})
afterEach(() => rmSync(home, { recursive: true, force: true }))

test('reads new lines once, across a restart with the same store', async () => {
  const file = join(home, 'logs', 'k1', 'aaa.server.log')
  const store = memoryLogStore()
  writeFileSync(file, '{"level":50,"msg":"boom","fn":"a"}\nplain line\npartial')
  await new LogCollector(home, store).sweep()
  assert.strictEqual((await store.list('k1')).length, 2)
  await new LogCollector(home, store).sweep()
  assert.strictEqual((await store.list('k1')).length, 2)
  appendFileSync(file, ' done\n')
  await new LogCollector(home, store).sweep()
  const rows = await store.list('k1')
  assert.strictEqual(rows.length, 3)
  assert.strictEqual(rows[0].text, 'partial done')
})

test('a new run file is read from the start, the old one is left alone', async () => {
  const store = memoryLogStore()
  writeFileSync(join(home, 'logs', 'k1', 'aaa.server.log'), 'one\ntwo\n')
  const collector = new LogCollector(home, store)
  await collector.sweep()
  writeFileSync(join(home, 'logs', 'k1', 'bbb.server.log'), 'x\n')
  await collector.sweep()
  assert.strictEqual((await store.list('k1')).length, 3)
})

test('telemetry lines land in the metric table, everything else stays a log', async () => {
  const store = memoryLogStore()
  const invocation = { __pikku_telemetry: true, type: 'telemetry', wiretype: 'http', wireid: 'GET:/todos', traceid: 'abc-1', outcome: 'error', totalduration: 42, method: 'GET', path: '/todos', errorName: 'Boom', errorMessage: 'nope', tenantuserid: 'u1' }
  const process = { __pikku_telemetry: true, type: 'process', command: 'dev', cpuusageusec: 1500000, cpupct: 12.5, memmb: 310.2, heapmb: 120, looplagms: 3 }
  writeFileSync(join(home, 'logs', 'k1', 'aaa.server.log'), `${JSON.stringify(invocation)}\nplain line\n${JSON.stringify(process)}\n`)
  await new LogCollector(home, store).sweep()
  assert.strictEqual((await store.list('k1')).length, 1)
  const metrics = await store.metrics('k1')
  assert.strictEqual(metrics.length, 2)
  const call = metrics.find((m) => m.kind === 'invocation')!
  assert.deepStrictEqual([call.run, call.wireType, call.wireId, call.trace, call.outcome, call.durationMs, call.httpMethod, call.httpPath, call.errorName, call.tenantUserId], ['aaa', 'http', 'GET:/todos', 'abc-1', 'error', 42, 'GET', '/todos', 'Boom', 'u1'])
  const sample = metrics.find((m) => m.kind === 'process')!
  assert.deepStrictEqual([sample.command, sample.cpuUsageUs, sample.cpuPct, sample.memMb, sample.heapMb, sample.loopLagMs], ['dev', 1500000, 12.5, 310.2, 120, 3])
  assert.strictEqual((await store.metrics('k1', { outcome: 'error' })).length, 1)
  assert.strictEqual((await store.metrics('k1', { kind: 'process', minDurationMs: 10 })).length, 0)
})

test('metrics written to a project .pikku/runs are ingested once, under the project key', async () => {
  const project = mkdtempSync(join(tmpdir(), 'proj-'))
  try {
    const dir = join(project, '.pikku', 'runs')
    mkdirSync(dir, { recursive: true })
    const sample = { __pikku_telemetry: true, type: 'process', command: 'dev', cpuusageusec: 10, cpupct: 1, memmb: 100, heapmb: 50, looplagms: 1 }
    writeFileSync(join(dir, 'zzz.dev.jsonl'), `${JSON.stringify(sample)}\n${JSON.stringify({ ...sample, memmb: 120 })}\n`)
    const store = memoryLogStore()
    const collector = new LogCollector(home, store, async () => ['k9'], undefined, async () => [{ key: 'k9', dir }])
    await collector.sweep()
    await collector.sweep()
    const metrics = await store.metrics('k9')
    assert.strictEqual(metrics.length, 2)
    assert.deepStrictEqual([metrics[0].run, metrics[0].source, metrics[0].memMb], ['zzz', 'dev', 120])
    appendFileSync(join(dir, 'zzz.dev.jsonl'), `${JSON.stringify({ ...sample, memmb: 130 })}\n`)
    await collector.sweep()
    assert.strictEqual((await store.metrics('k9')).length, 3)
    assert.strictEqual((await store.list('k9')).length, 0)
  } finally {
    rmSync(project, { recursive: true, force: true })
  }
})

test('pruning leaves loose files in the logs directory alone', async () => {
  const store = memoryLogStore()
  const design = join(home, 'logs', 'k1-design.log')
  writeFileSync(design, 'design up\n')
  writeFileSync(join(home, 'logs', 'k1', 'aaa.server.log'), 'one\n')
  mkdirSync(join(home, 'logs', 'gone'), { recursive: true })
  await new LogCollector(home, store, async () => ['k1']).sweep()
  assert.ok(existsSync(design))
  assert.ok(!existsSync(join(home, 'logs', 'gone')))
})
