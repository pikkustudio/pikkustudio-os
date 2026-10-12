import assert from 'node:assert'
import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createServer } from 'node:net'
import { afterEach, describe, test } from 'node:test'
import { Supervisor, type ServiceSpec, type SupervisorEvent } from '../src/index.ts'

const freePort = () =>
  new Promise<number>((resolve) => {
    const server = createServer().listen(0, '127.0.0.1', () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolve(port))
    })
  })

const listener = (port: number, extra = '') =>
  `require('net').createServer().listen(${port},'127.0.0.1');${extra}`

const fast = { backoffMs: 20, maxBackoffMs: 200, graceMs: 500, pollMs: 20, readyTimeoutMs: 3000, stableMs: 60_000 }

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const until = async (check: () => boolean, ms = 5000) => {
  const end = Date.now() + ms
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out')
    await new Promise((r) => setTimeout(r, 20))
  }
}

describe('Supervisor', () => {
  let dir: string
  let supervisor: Supervisor
  let counter = 0

  const spec = async (script: string, port: number, extra: Partial<ServiceSpec> = {}): Promise<ServiceSpec> => {
    dir ??= await mkdtemp(join(tmpdir(), 'supervisor-'))
    return {
      name: `svc${counter++}`,
      command: process.execPath,
      args: ['-e', script],
      cwd: dir,
      env: {},
      port,
      logPath: join(dir, `log${counter}.txt`),
      ...extra,
    }
  }

  afterEach(async () => {
    await supervisor?.stopAll('k')
  })

  test('starts and becomes ready', async () => {
    supervisor = new Supervisor(fast)
    const port = await freePort()
    const s = await spec(listener(port, 'console.log("hello")'), port)
    const status = await supervisor.start('k', s)
    assert.equal(status.state, 'ready')
    assert.ok(status.pid)
    assert.equal(supervisor.list('k').length, 1)
    await until(() => supervisor.status('k', s.name)!.logTail.includes('hello'))
  })

  test('exit before ready rejects with the log tail', async () => {
    supervisor = new Supervisor(fast)
    const s = await spec('console.log("boom reason");process.exit(3)', await freePort())
    await assert.rejects(supervisor.start('k', s), /boom reason/)
    const status = supervisor.status('k', s.name)!
    assert.equal(status.state, 'failed')
    assert.equal(status.lastExit?.code, 3)
  })

  test('crash restarts with backoff', async () => {
    supervisor = new Supervisor(fast)
    const port = await freePort()
    const s = await spec(listener(port, 'setTimeout(()=>process.exit(1),150)'), port, { restart: 'on-crash' })
    const states: string[] = []
    supervisor.onChange((e) => states.push(e.state))
    await supervisor.start('k', s)
    await until(() => states.includes('restarting'))
    await until(() => states.filter((x) => x === 'ready').length >= 2)
    assert.ok(supervisor.status('k', s.name)!.restarts >= 1)
  })

  test('maxRestarts exhausted ends in failed with the log tail', async () => {
    supervisor = new Supervisor(fast)
    const port = await freePort()
    const s = await spec(listener(port, 'console.log("dying");setTimeout(()=>process.exit(1),50)'), port, {
      restart: 'on-crash',
      maxRestarts: 2,
    })
    await supervisor.start('k', s)
    await until(() => supervisor.status('k', s.name)!.state === 'failed')
    const status = supervisor.status('k', s.name)!
    assert.equal(status.restarts, 2)
    assert.match(status.logTail, /dying/)
  })

  test('stop does not restart and kills grandchildren', async () => {
    supervisor = new Supervisor(fast)
    const port = await freePort()
    const script = listener(
      port,
      `const c=require('child_process').spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore'});console.log('GC='+c.pid)`
    )
    const s = await spec(script, port, { restart: 'on-crash' })
    await supervisor.start('k', s)
    await until(() => /GC=\d+/.test(supervisor.status('k', s.name)!.logTail))
    const grandchild = Number(/GC=(\d+)/.exec(supervisor.status('k', s.name)!.logTail)![1])
    assert.ok(alive(grandchild))
    await supervisor.stop('k', s.name)
    await until(() => !alive(grandchild))
    await new Promise((r) => setTimeout(r, 200))
    const status = supervisor.status('k', s.name)!
    assert.equal(status.state, 'stopped')
    assert.equal(status.restarts, 0)
    assert.equal(status.pid, null)
  })

  test('onChange emits transitions and unsubscribes', async () => {
    supervisor = new Supervisor(fast)
    const port = await freePort()
    const s = await spec(listener(port), port)
    const events: SupervisorEvent[] = []
    const off = supervisor.onChange((e) => events.push(e))
    await supervisor.start('k', s)
    await supervisor.stop('k', s.name)
    off()
    await supervisor.stop('k', s.name)
    assert.deepEqual(events.map((e) => e.state), ['starting', 'ready', 'stopped'])
    assert.equal(events[0].key, 'k')
    assert.equal(events[0].name, s.name)
  })

  test('reapStrays kills a recorded orphan', async () => {
    dir ??= await mkdtemp(join(tmpdir(), 'supervisor-'))
    const pidFile = join(dir, 'pids', 'supervisor.json')
    const first = new Supervisor({ ...fast, pidFile })
    const port = await freePort()
    const s = await spec(listener(port), port)
    const { pid } = await first.start('k', s)
    assert.ok(pid && alive(pid))
    assert.ok(JSON.parse(await readFile(pidFile, 'utf8'))[`k/${s.name}`] === pid)
    supervisor = new Supervisor({ ...fast, pidFile })
    await supervisor.reapStrays()
    await until(() => !alive(pid!))
  })
})
