import assert from 'node:assert'
import { EventEmitter } from 'node:events'
import { writeFileSync } from 'node:fs'
import { PassThrough } from 'node:stream'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { BuilderSession, type Launcher } from './session.js'

// A pi that runs once in print mode: it may write the heal report the report_fix tool writes.
const fakePi =
  (report: object | null, prompts: string[], code = 0): Launcher =>
  (_command, args, options) => {
    prompts.push(args.at(-1)!)
    const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough(), stdin: new PassThrough(), kill: () => true })
    setImmediate(() => {
      if (report) writeFileSync(options.env.PIKKU_HEAL_REPORT!, JSON.stringify(report))
      child.emit('exit', code)
    })
    return child as never
  }

const builder = async (launch: Launcher) => {
  const dir = await mkdtemp(join(tmpdir(), 'builder-heal-'))
  return new BuilderSession(async () => ({ cwd: dir, healDir: join(dir, 'heal'), launch }), join(dir, 'home'))
}

test('heal runs one standalone turn and returns the reported fix', async () => {
  const prompts: string[] = []
  const session = await builder(fakePi({ fixed: true, summary: 'Added the missing import.' }, prompts))
  assert.deepStrictEqual(await session.heal('app', 'Cannot find module ./db'), { ok: true, summary: 'Added the missing import.' })
  assert.match(prompts[0]!, /Cannot find module \.\/db/)
  assert.deepStrictEqual((await session.state('app')).items, [], 'the chat transcript is untouched')
})

test('heal says so when the helper stops without a report', async () => {
  const session = await builder(fakePi(null, []))
  assert.deepStrictEqual(await session.heal('app', 'x'), { ok: false, summary: 'The helper stopped without saying whether it fixed it.' })
})
