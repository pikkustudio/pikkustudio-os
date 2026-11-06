import assert from 'node:assert'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { projectMap, withProjectMap, type CommandRunner } from './changes.js'
import { BuilderSession } from './index.js'

const MAP = 'Search: pikku meta grep <terms>.\ntables: patient'
const ROUTE = JSON.stringify({ agent: 'intake', skill: 'pikku-intake', refs: [], reason: 'new', context: null, merged: [] })

const echoPi = `
const rl = require('node:readline').createInterface({ input: process.stdin })
const out = (e) => process.stdout.write(JSON.stringify(e) + '\\n')
rl.on('line', (line) => {
  const cmd = JSON.parse(line)
  if (cmd.type !== 'prompt') return
  out({ type: 'agent_start' })
  out({ type: 'message_update', assistantMessageEvent: { type: 'text_delta', delta: cmd.message } })
  out({ type: 'agent_end' })
})
rl.on('close', () => process.exit(0))
`

const until = async (check: () => Promise<boolean>) => {
  for (let i = 0; i < 300; i++) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('timed out')
}

const asked = (output: string, code = 0): CommandRunner => async (_cwd, args) => (args[0] === 'meta' ? { code, output } : { code: 0, output: ROUTE })

describe('projectMap', () => {
  test('asks without the banner and drops what the CLI logged first', async () => {
    let env: Record<string, string> | undefined
    const run: CommandRunner = async (_cwd, _args, sent) => {
      env = sent
      return { code: 0, output: `[PKU489] a warning\n\n${MAP}\n` }
    }
    assert.equal(await projectMap('/app', run, { A: '1' }), MAP)
    assert.deepEqual(env, { A: '1', PIKKU_NO_LOGO: '1' })
  })

  test('is empty when there is no map to give', async () => {
    assert.equal(await projectMap('/app', asked(MAP, 1)), '')
    assert.equal(await projectMap('/app', asked('{"schemaVersion":"meta-context.v1"}')), '')
    assert.equal(await projectMap('/app', asked(`${MAP}${'x'.repeat(13000)}`)), '')
    assert.equal(await projectMap('/app', async () => Promise.reject(new Error('no pikku'))), '')
  })

  test('leaves the message alone without a map', () => {
    assert.equal(withProjectMap('hello', ''), 'hello')
    assert.equal(withProjectMap('hello', 'map'), 'hello\n\n<project-map>\nmap\n</project-map>')
  })
})

describe('BuilderSession.prompt', () => {
  const session = async (run: CommandRunner) => {
    const home = await mkdtemp(join(tmpdir(), 'pikku-builder-'))
    return new BuilderSession(
      async () => ({ cwd: home, loop: false, run, launch: () => spawn(process.execPath, ['-e', echoPi], { stdio: ['pipe', 'pipe', 'pipe'] }) }),
      home
    )
  }
  const sent = async (builder: BuilderSession, count: number) => {
    await until(async () => {
      const { busy, items } = await builder.state('shop')
      return !busy && items.filter((item) => item.kind !== 'user').length >= count
    })
    return JSON.stringify((await builder.state('shop')).items)
  }

  test('puts the map in the first build message only', async () => {
    const builder = await session(asked(MAP))
    await builder.prompt('shop', 'add a page')
    assert.ok((await sent(builder, 1)).includes('<project-map>'))
    await builder.prompt('shop', 'and another')
    const after = await sent(builder, 2)
    assert.equal(after.split('<project-map>').length, 2)
  })

  test('sends the message without a map when the CLI has none', async () => {
    const builder = await session(asked('Unknown command', 1))
    await builder.prompt('shop', 'add a page')
    const items = await sent(builder, 1)
    assert.ok(items.includes('You are the intake agent'))
    assert.ok(!items.includes('<project-map>'))
  })
})
