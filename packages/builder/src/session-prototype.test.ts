import assert from 'node:assert'
import { spawn } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { BuilderSession, PROTOTYPE_PROMPT } from './index.js'

const echoPi = `
const rl = require('node:readline').createInterface({ input: process.stdin })
const out = (e) => process.stdout.write(JSON.stringify(e) + '\\n')
rl.on('line', (line) => {
  const cmd = JSON.parse(line)
  if (cmd.type !== 'prompt') return
  out({ type: 'agent_start' })
  out({ type: 'agent_end' })
})
`

describe('prototype agent', () => {
  test('runs inside prototypes/app with only the design skill and skips the router', async () => {
    const home = await mkdtemp(join(tmpdir(), 'pikku-proto-'))
    const skill = join(home, 'impeccable')
    await mkdir(skill, { recursive: true })
    await writeFile(join(skill, 'SKILL.md'), '# impeccable\n')
    process.env.PIKKU_IMPECCABLE_SKILL = skill
    const launched: { args: string[]; cwd?: string }[] = []
    const routed: string[][] = []
    const builder = new BuilderSession(
      async () => ({
        cwd: home,
        run: async (_cwd, args) => {
          routed.push(args)
          return { code: 0, output: '{}' }
        },
        launch: (_cmd, args, options) => {
          launched.push({ args, cwd: options?.cwd as string | undefined })
          return spawn(process.execPath, ['-e', echoPi], { stdio: ['pipe', 'pipe', 'pipe'] })
        },
      }),
      home
    )
    await builder.prototype('shop', 'Make the home screen')
    assert.equal(launched.length, 1)
    assert.equal(launched[0].cwd, join(home, 'prototypes', 'app'))
    assert.ok(launched[0].args.includes('--no-skills'))
    assert.ok(launched[0].args.includes(PROTOTYPE_PROMPT))
    assert.ok(launched[0].args.includes(skill))
    assert.equal(routed.length, 0)
  })

  test('refuses an empty request', async () => {
    const builder = new BuilderSession(async () => ({ cwd: '/', run: async () => ({ code: 0, output: '{}' }) }), '/tmp')
    await assert.rejects(() => builder.prototype('shop', '  '), /which screen/i)
  })
})
