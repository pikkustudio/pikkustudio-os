import assert from 'node:assert'
import { spawn } from 'node:child_process'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { BuilderSession, MODE_PROMPTS, OFFER_MARKER, piArgs } from './index.js'

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
  const said = async () => {
    await until(async () => !(await builder.state('shop')).busy)
    return (await builder.state('shop')).items.filter((i) => i.kind === 'assistant').map((i) => (i as { text: string }).text).join('\n')
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
    assert.equal(await said(), 'Who is it for?')
    assert.deepEqual(routed.filter((a) => a.includes('--prompt')), [])
    assert.ok(modes.every((m) => m === 'knowledge'))
  })

  test('a different mode cannot join a running turn', async () => {
    const { builder } = await harness()
    await builder.prompt('shop', 'Sketch it', undefined, 'artifacts')
    await assert.rejects(builder.prompt('shop', 'Change the app', undefined, 'build'), /busy with artifacts/)
  })

  test('each mode carries its own prompt to pi', () => {
    const args = piArgs({ skills: '/skills', scope: 'knowledge' })
    assert.ok(args.some((a) => a.includes(MODE_PROMPTS.knowledge)))
    assert.ok(!piArgs({ skills: '/skills', scope: 'build' }).some((a) => a.includes(MODE_PROMPTS.knowledge)))
  })
})
