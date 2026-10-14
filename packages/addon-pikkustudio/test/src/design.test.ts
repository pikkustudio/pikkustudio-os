import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { StudioProjectsService, type AccountProvider } from '../../src/services/projects.js'

const account: AccountProvider = {
  account: async () => ({ signedIn: false, apiUrl: '', consoleUrl: '' }),
  projects: async () => [],
  startSignIn: async () => ({ code: '', url: '', expiresAt: new Date().toISOString() }),
  pollSignIn: async () => 'confirmed',
  locate: async () => null,
  adopt: async () => {},
  signOut: async () => {},
}

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, stdio: 'pipe' })

const until = async (check: () => boolean, ms = 8000) => {
  const end = Date.now() + ms
  while (!check()) {
    if (Date.now() > end) throw new Error('timed out')
    await new Promise((r) => setTimeout(r, 25))
  }
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const setup = async (entrySource: string, env?: () => Record<string, string>, paraglideCommand?: (appDir: string) => { command: string; args: string[] } | null, withMessages = false) => {
  const base = await mkdtemp(join(tmpdir(), 'pikku-studio-design-'))
  const source = join(base, 'design-src')
  await mkdir(source, { recursive: true })
  await writeFile(join(source, 'design.mjs'), entrySource)
  const path = join(base, 'shop')
  await mkdir(path, { recursive: true })
  await writeFile(join(path, 'package.json'), JSON.stringify({ name: 'shop' }))
  if (withMessages) {
    await mkdir(join(path, 'apps', 'app', 'messages'), { recursive: true })
    await mkdir(join(path, 'apps', 'app', 'project.inlang'), { recursive: true })
    await writeFile(join(path, 'apps', 'app', 'messages', 'en.json'), '{"hello":"Hello"}')
    await writeFile(join(path, 'apps', 'app', 'project.inlang', 'settings.json'), '{}')
  }
  git(path, 'init', '-q', '-b', 'main')
  git(path, 'add', '-A')
  git(path, 'commit', '-qm', 'init')
  const service = new StudioProjectsService({
    account,
    home: join(base, 'studio'),
    projectsDir: join(base, 'studio', 'local'),
    designEntry: join(source, 'design.mjs'),
    paraglideCommand,
    devCommand: () => ({ command: 'sh', args: ['-c', 'echo "$PIKKU_DESIGN_SERVER_URL" > url.txt; env > project-env.txt; env | grep -c PIKKU_STUDIO_DESIGN > legacy.txt; sleep 30'] }),
    installCommand: () => null,
    env,
    waitForPort: async () => {},
    confine: false,
  })
  const added = await service.add(path)
  return { service, key: added.key }
}

const listening = `
import { createServer } from 'node:net'
import { parseArgs } from 'node:util'
import { writeFileSync } from 'node:fs'
const { values } = parseArgs({ options: { root: { type: 'string' }, port: { type: 'string' } } })
writeFileSync(values.root + '/design-args.txt', process.argv.slice(2).join(' '))
createServer().listen(Number(values.port), '127.0.0.1')
console.log('design up')
`

const dumpEnv = `
import { createServer } from 'node:net'
import { parseArgs } from 'node:util'
import { writeFileSync } from 'node:fs'
const { values } = parseArgs({ options: { root: { type: 'string' }, port: { type: 'string' } } })
writeFileSync(values.root + '/design-env.json', JSON.stringify(process.env))
createServer().listen(Number(values.port), '127.0.0.1')
`

describe('design server', () => {
  test('gets a minimal env: no studio token, no project env, no ambient credentials', async () => {
    const saved = { ...process.env }
    process.env.PIKKU_DESIGN_ORIGIN = 'https://design.example'
    process.env.AWS_SECRET_ACCESS_KEY = 'ambient-secret'
    const { service, key } = await setup(dumpEnv, () => ({ FAKE_AI_KEY: 'sk-fake-secret' }))
    try {
      const opened = await service.open(key)
      await until(() => existsSync(join(opened.worktree, 'design-env.json')))
      const design = JSON.parse(readFileSync(join(opened.worktree, 'design-env.json'), 'utf8')) as Record<string, string>
      assert.equal(design.PIKKU_STUDIO_TOKEN, undefined)
      assert.equal(design.PIKKU_CONSOLE_TOKEN, undefined)
      assert.equal(design.FAKE_AI_KEY, undefined)
      assert.equal(design.AWS_SECRET_ACCESS_KEY, undefined)
      assert.equal(design.PIKKU_DESIGN_ORIGIN, 'https://design.example')
      assert.ok(design.PATH)
      assert.ok(!JSON.stringify(design).includes('sk-fake-secret'))
      await until(() => existsSync(join(opened.worktree, 'project-env.txt')))
      const project = readFileSync(join(opened.worktree, 'project-env.txt'), 'utf8')
      assert.match(project, /^PIKKU_STUDIO_TOKEN=/m)
      assert.match(project, /^FAKE_AI_KEY=sk-fake-secret$/m)
    } finally {
      service.killAll()
      for (const k of Object.keys(process.env)) if (!(k in saved)) delete process.env[k]
      Object.assign(process.env, saved)
    }
  })

  test('starts beside the dev server and the dev server is told where it is', async () => {
    const { service, key } = await setup(listening)
    try {
      const opened = await service.open(key)
      await until(() => service.designStatus(key)?.state === 'ready')
      const design = service.designStatus(key)!
      await until(() => existsSync(join(opened.worktree, 'url.txt')))
      assert.equal(readFileSync(join(opened.worktree, 'url.txt'), 'utf8').trim(), design.url)
      assert.match(design.url, /^http:\/\/127\.0\.0\.1:\d+\/$/)
      assert.match(readFileSync(join(opened.worktree, 'legacy.txt'), 'utf8').trim(), /^0$/)
      const args = readFileSync(join(opened.worktree, 'design-args.txt'), 'utf8')
      assert.ok(args.includes(`--root ${opened.worktree}`))
      assert.ok(args.includes(`--port ${new URL(design.url).port}`))
    } finally {
      service.killAll()
    }
  })

  test('a design server that crashes does not stop the project from opening', async () => {
    const { service, key } = await setup(`console.error('design exploded'); process.exit(1)`)
    try {
      const opened = await service.open(key)
      assert.ok(opened.port)
      await until(() => service.designStatus(key)?.state === 'failed')
      const design = service.designStatus(key)!
      assert.match(design.logTail, /design exploded/)
      assert.equal(design.lastExit?.code, 1)
      assert.ok(service.runningProject(key))
    } finally {
      service.killAll()
    }
  })

  test('closing the project stops the design server', async () => {
    const { service, key } = await setup(listening)
    try {
      await service.open(key)
      await until(() => service.designStatus(key)?.state === 'ready')
      const pid = (service as any).supervisor.status(key, 'design').pid as number
      assert.ok(alive(pid))
      service.close(key)
      await until(() => !alive(pid))
      assert.equal(service.designStatus(key), null)
    } finally {
      service.killAll()
    }
  })

  test('killAll takes the design server down with Studio', async () => {
    const { service, key } = await setup(listening)
    await service.open(key)
    await until(() => service.designStatus(key)?.state === 'ready')
    const pid = (service as any).supervisor.status(key, 'design').pid as number
    service.killAll()
    await until(() => !alive(pid))
  })

  const writer = (body: string) => () => ({ command: 'sh', args: ['-c', body] })

  test('compiles the project messages before the design server starts', async () => {
    const { service, key } = await setup(listening, undefined, writer('mkdir -p src/paraglide && echo x > src/paraglide/runtime.js && echo run >> ../../compiled.txt'), true)
    try {
      const opened = await service.open(key)
      await until(() => service.designStatus(key)?.state === 'ready')
      assert.ok(existsSync(join(opened.worktree, 'apps', 'app', 'src', 'paraglide', 'runtime.js')))
      assert.equal(readFileSync(join(opened.worktree, 'compiled.txt'), 'utf8').trim(), 'run')
    } finally {
      service.killAll()
    }
  })

  test('skips the compile when the output is newer than the messages', async () => {
    const { service, key } = await setup(listening, undefined, writer('mkdir -p src/paraglide && echo x > src/paraglide/runtime.js && echo run >> ../../compiled.txt'), true)
    try {
      const opened = await service.open(key)
      await until(() => service.designStatus(key)?.state === 'ready')
      service.close(key)
      const again = await service.open(key)
      await until(() => service.designStatus(key)?.state === 'ready')
      assert.equal(readFileSync(join(again.worktree, 'compiled.txt'), 'utf8').trim().split('\n').length, 1)
    } finally {
      service.killAll()
    }
  })

  test('a failed compile shows as a failed design with the output, and never stops the project', async () => {
    const { service, key } = await setup(listening, undefined, writer('echo "bad message at line 3" >&2; exit 2'), true)
    try {
      const opened = await service.open(key)
      assert.ok(opened.port)
      await until(() => service.designStatus(key)?.state === 'failed')
      assert.match(service.designStatus(key)!.logTail, /bad message at line 3/)
      assert.ok(service.runningProject(key))
    } finally {
      service.killAll()
    }
  })

  test('restarting the design retries the compile', async () => {
    const { service, key } = await setup(listening, undefined, writer('test -f ../../ok || { echo nope >&2; exit 1; }; mkdir -p src/paraglide && echo x > src/paraglide/runtime.js'), true)
    try {
      const opened = await service.open(key)
      await until(() => service.designStatus(key)?.state === 'failed')
      await writeFile(join(opened.worktree, 'ok'), '')
      const status = await service.restartDesign(key)
      assert.ok(status)
      await until(() => service.designStatus(key)?.state === 'ready')
    } finally {
      service.killAll()
    }
  })
})
