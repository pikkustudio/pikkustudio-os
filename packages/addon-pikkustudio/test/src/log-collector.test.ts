import assert from 'node:assert'
import { afterEach, beforeEach, test } from 'node:test'
import { appendFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
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
