import assert from 'node:assert'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { BuilderSession, type Launcher } from './session.js'

test('a plan that hangs is killed hard and tried once more', async () => {
  process.env.PIKKU_PLAN_TIMEOUT_MS = '50'
  process.env.PIKKU_KILL_GRACE_MS = '50'
  const home = await mkdtemp(join(tmpdir(), 'pikku-builder-'))
  const calls: (string | undefined)[][] = []
  const launch: Launcher = () => {
    const signals: (string | undefined)[] = []
    calls.push(signals)
    const child = Object.assign(new EventEmitter(), {
      stdout: new PassThrough(),
      stderr: new PassThrough(),
      stdin: new PassThrough(),
      kill: (signal?: string) => {
        signals.push(signal)
        if (signal === 'SIGKILL') child.emit('exit', null, 'SIGKILL')
        return true
      },
    })
    if (calls.length > 2) setImmediate(() => child.emit('exit', 0))
    return child as never
  }
  const builder = new BuilderSession(async () => ({ cwd: home, run: async () => ({ code: 0, output: '' }) as never, launch }), home)
  await builder.directions('shop', 'a shop', 1).catch(() => undefined)
  assert.deepEqual(calls[0], [undefined, 'SIGKILL'])
  assert.deepEqual(calls[1], [undefined, 'SIGKILL'])
  assert.ok(calls.length >= 3)
})
