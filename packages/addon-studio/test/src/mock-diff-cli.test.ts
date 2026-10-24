import assert from 'node:assert'
import { existsSync } from 'node:fs'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, test } from 'node:test'
import { promisify } from 'node:util'
import { readMockPlan } from '../../src/services/mock-plan.js'
import { readMockStatus, parseMocksOutput, type MockRunner } from '../../src/services/mock-status.js'

const exec = promisify(execFile)
const bin = process.env.PIKKU_MOCKS_BIN ?? join(process.env.HOME ?? '', 'git/pikku/wt-mocks/packages/cli/dist/bin/pikku.js')
const skip = existsSync(bin) ? false : 'pikku mocks CLI is not built'

const runner: MockRunner = async (cwd, args) => {
  const result = await exec('node', [bin, ...args, '--json'], { cwd }).catch((e: { stdout?: string }) => ({ stdout: e.stdout ?? '' }))
  return result.stdout
}

const schema = {
  type: 'array',
  items: { type: 'object', properties: { id: { type: 'string' }, guests: { type: 'integer' } }, required: ['id', 'guests'] },
}

const dirs: string[] = []
after(() => Promise.all(dirs.map((d) => rm(d, { recursive: true, force: true }))))

async function project(mocks: Record<string, Record<string, string>>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), 'mocks-cli-'))
  dirs.push(dir)
  await mkdir(join(dir, '.pikku/function'), { recursive: true })
  await mkdir(join(dir, '.pikku/schemas/schemas'), { recursive: true })
  await writeFile(join(dir, 'pikku.config.json'), JSON.stringify({ srcDirectories: ['src'], outDir: '.pikku', tsconfig: './tsconfig.json' }))
  await writeFile(join(dir, 'tsconfig.json'), '{}')
  await writeFile(join(dir, '.pikku/function/pikku-functions-meta.gen.json'), JSON.stringify({ 'bookings:list': { pikkuFuncId: 'bookings:list', name: 'bookings:list', inputSchemaName: null, outputSchemaName: 'BookingsOut', expose: true } }))
  await writeFile(join(dir, '.pikku/schemas/schemas/BookingsOut.schema.json'), JSON.stringify(schema))
  for (const [rpc, files] of Object.entries(mocks)) {
    await mkdir(join(dir, '.mocks', rpc), { recursive: true })
    for (const [name, body] of Object.entries(files)) await writeFile(join(dir, '.mocks', rpc, name), body)
  }
  return dir
}

const meta = '{"state":"healthy","default":true}'
const fitting = '[{"id":"a","guests":2}]'

async function compare(dir: string) {
  const cli = parseMocksOutput<{ rpcs: { rpc: string; status: string }[] }>(await runner(dir, ['mocks', 'diff']))!
  const plan = await readMockPlan(dir, runner)
  const status = await readMockStatus(dir, runner)
  const by = (s: string) => cli.rpcs.filter((r) => r.status === s).map((r) => r.rpc).sort()
  assert.deepEqual(plan.added.map((a) => a.rpc).sort(), by('added'))
  assert.deepEqual(plan.changed.map((a) => a.rpc).sort(), by('changed'))
  assert.deepEqual(plan.invalid.map((a) => a.rpc).sort(), by('invalid'))
  assert.deepEqual([...status.changed].sort(), [...by('changed'), ...by('invalid')].sort())
  return { cli, plan, status }
}

describe('Make it real list against the real pikku mocks diff', { skip }, () => {
  test('a mock that fits is on no list', async () => {
    const { cli, plan, status } = await compare(await project({ 'bookings.list': { 'busy.json': fitting, 'busy.meta.json': meta } }))
    assert.deepEqual(cli.rpcs.map((r) => r.status), ['ok'])
    assert.deepEqual([plan.added, plan.changed, plan.invalid, status.changed], [[], [], [], []])
  })

  test('a field the function lacks is changed', async () => {
    const { cli, plan } = await compare(await project({ 'bookings.list': { 'busy.json': '[{"id":"a","guests":2,"vip":true}]', 'busy.meta.json': meta } }))
    assert.equal(cli.rpcs[0]!.status, 'changed')
    assert.match(plan.changed[0]!.reason, /vip/)
  })

  test('a retyped field is changed', async () => {
    const { cli, plan } = await compare(await project({ 'bookings.list': { 'busy.json': '[{"id":"a","guests":"two"}]', 'busy.meta.json': meta } }))
    assert.ok(['changed', 'invalid'].includes(cli.rpcs[0]!.status))
    assert.equal(plan.changed.length + plan.invalid.length, 1)
  })

  test('a malformed file is invalid', async () => {
    const { cli, plan, status } = await compare(await project({ 'bookings.list': { 'busy.json': '[{"id":', 'busy.meta.json': meta } }))
    assert.equal(cli.rpcs[0]!.status, 'invalid')
    assert.equal(plan.invalid.length, 1)
    assert.deepEqual(status.changed, ['bookings:list'])
  })

  test('a mock with no function is added', async () => {
    const { cli, plan } = await compare(await project({ 'orders.list': { 'busy.json': fitting, 'busy.meta.json': meta } }))
    assert.deepEqual(cli.rpcs.map((r) => r.status), ['added'])
    assert.deepEqual(plan.added, [{ rpc: 'orders:list', scenarios: ['busy'] }])
  })
})
