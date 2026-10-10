import assert from 'node:assert'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { BuilderSession, type BuilderMode, MODE_PROMPTS, OFFER_MARKER, piArgs } from './index.js'
import { projectKey, slotKey } from './pi.js'

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
`

const until = async (check: () => Promise<boolean>) => {
  for (let i = 0; i < 300; i++) {
    if (await check()) return
    await new Promise((r) => setTimeout(r, 10))
  }
  throw new Error('timed out')
}

const harness = async () => {
  const home = await mkdtemp(join(tmpdir(), 'pikku-modes-'))
  const routed: string[][] = []
  const modes: (string | undefined)[] = []
  const builder = new BuilderSession(
    async (_key, mode) => {
      modes.push(mode)
      return {
        cwd: home,
        run: async (_cwd, args) => {
          routed.push(args)
          return { code: 0, output: '{}' }
        },
        launch: () => spawn(process.execPath, ['-e', echoPi], { stdio: ['pipe', 'pipe', 'pipe'] }),
      }
    },
    home
  )
  const said = async (mode: BuilderMode = 'build') => {
    const slot = slotKey('shop', mode)
    await until(async () => !(await builder.state(slot)).busy)
    return (await builder.state(slot)).items.filter((i) => i.kind === 'assistant').map((i) => (i as { text: string }).text).join('\n')
  }
  return { builder, routed, modes, said }
}

describe('builder modes', () => {
  test('a Build offer asks pi to size the job first and skips the router', async () => {
    const { builder, routed, said } = await harness()
    await builder.prompt('shop', 'Add checkout with payments', undefined, 'build', true)
    const sent = await said()
    assert.match(sent, /Add checkout with payments/)
    assert.ok(sent.includes(OFFER_MARKER))
    assert.match(sent, /pikku changes file/)
    assert.deepEqual(routed.filter((a) => a.includes('--prompt')), [])
  })

  test('a mode sends the request as written and launches with that mode', async () => {
    const { builder, routed, modes, said } = await harness()
    await builder.prompt('shop', 'Who is it for?', undefined, 'knowledge')
    assert.equal(await said('knowledge'), 'Who is it for?')
    assert.deepEqual(routed.filter((a) => a.includes('--prompt')), [])
    assert.ok(modes.every((m) => m === 'knowledge'))
  })

  test('a different mode runs in its own session while another is busy', async () => {
    const { builder } = await harness()
    await builder.prompt('shop', 'Sketch it', undefined, 'artifacts')
    await builder.prompt('shop', 'Reword it', undefined, 'emails')
    assert.ok(builder.isProjectBusy('shop'))
    assert.equal((await builder.state(slotKey('shop', 'artifacts'))).items[0]?.kind, 'user')
    assert.equal((await builder.state(slotKey('shop', 'emails'))).items[0]?.kind, 'user')
    assert.equal((await builder.state(slotKey('shop'))).items.length, 0)
  })

  test('each mode carries its own prompt to pi', () => {
    const args = piArgs({ skills: '/skills', scope: 'knowledge' })
    assert.ok(args.some((a) => a.includes(MODE_PROMPTS.knowledge)))
    assert.ok(!piArgs({ skills: '/skills', scope: 'build' }).some((a) => a.includes(MODE_PROMPTS.knowledge)))
  })
})

describe('specialist slots', () => {
  test('each specialist has its own state, busy flag and transcript, and build keeps the bare key', async () => {
    const home = await mkdtemp(join(tmpdir(), 'slots-'))
    const session = new BuilderSession(async () => ({ cwd: home }), home)
    assert.strictEqual(slotKey('p1'), 'p1')
    assert.strictEqual(slotKey('p1', 'emails'), 'p1:emails')
    assert.strictEqual(projectKey('p1:emails'), 'p1')
    assert.strictEqual(projectKey('p1'), 'p1')
    const build = await session.state(slotKey('p1'))
    const emails = await session.state(slotKey('p1', 'emails'))
    assert.notStrictEqual(build, emails)
    assert.notStrictEqual(build.session, emails.session)
    assert.match(emails.session, /^[\w-]+$/)
    emails.busy = true
    assert.strictEqual(session.isBusy(slotKey('p1')), false)
    assert.strictEqual(session.isBusy(slotKey('p1', 'emails')), true)
    assert.strictEqual(session.isProjectBusy('p1'), true)
    assert.strictEqual(session.isProjectBusy('p2'), false)
  })
})
