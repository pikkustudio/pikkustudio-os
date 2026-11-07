import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { createServer } from 'node:net'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, test } from 'node:test'
import { canConfine, confinedSpawn } from '../../src/services/confine.js'
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

const until = async (check: () => boolean | Promise<boolean>, ms = 8000) => {
  const end = Date.now() + ms
  while (!(await check())) {
    if (Date.now() > end) throw new Error('timed out')
    await new Promise((r) => setTimeout(r, 50))
  }
}

const freePort = () =>
  new Promise<number>((done) => {
    const server = createServer().listen(0, '127.0.0.1', () => {
      const port = (server.address() as { port: number }).port
      server.close(() => done(port))
    })
  })

describe('design server runs in place', () => {
  test('is spawned from the shared entry, no copy is made, stale copies are removed', async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-inplace-'))
    const source = join(base, 'design-src')
    await mkdir(source, { recursive: true })
    const entry = join(source, 'design.mjs')
    await writeFile(
      entry,
      `import { createServer } from 'node:net'
import { parseArgs } from 'node:util'
import { writeFileSync } from 'node:fs'
const { values } = parseArgs({ options: { root: { type: 'string' }, port: { type: 'string' } } })
writeFileSync(values.root + '/design-entry.txt', process.argv[1])
createServer().listen(Number(values.port), '127.0.0.1')
`
    )
    const path = join(base, 'shop')
    await mkdir(path, { recursive: true })
    await writeFile(join(path, 'package.json'), JSON.stringify({ name: 'shop' }))
    git(path, 'init', '-q', '-b', 'main')
    git(path, 'add', '-A')
    git(path, 'commit', '-qm', 'init')
    const home = join(base, 'studio')
    await mkdir(join(home, 'design', 'old-key'), { recursive: true })
    await writeFile(join(home, 'design', 'old-key', 'design.mjs'), '')
    const service = new StudioProjectsService({
      sources: { host: account },
      home,
      projectsDir: join(home, 'local'),
      designEntry: entry,
      devCommand: () => ({ command: 'sh', args: ['-c', 'sleep 30'] }),
      installCommand: () => null,
      waitForPort: async () => {},
      confine: false,
    })
    try {
      const { key } = await service.add(path)
      const opened = await service.open(key)
      await until(() => existsSync(join(opened.worktree, 'design-entry.txt')))
      assert.equal(realpathSync(readFileSync(join(opened.worktree, 'design-entry.txt'), 'utf8')), realpathSync(entry))
      assert.equal(existsSync(join(home, 'design')), false)
    } finally {
      service.killAll()
      await rm(base, { recursive: true, force: true })
    }
  })

  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'design-server')

  test('the confined server serves the page with its source read-only', { skip: !canConfine() || !existsSync(join(root, 'src', 'paraglide')) }, async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-inplace-confined-'))
    const project = join(base, 'shop')
    await mkdir(project, { recursive: true })
    await writeFile(join(project, 'package.json'), JSON.stringify({ name: 'shop' }))
    const listing = (dir: string) => readdirSync(dir).sort().join(',')
    const mtime = statSync(root).mtimeMs
    const before = listing(root)
    const port = await freePort()
    const service = new StudioProjectsService({ sources: { host: account }, home: join(base, 'studio'), designEntry: join(root, 'start.mjs') })
    // The real sandbox profile Studio builds for the design server.
    const confinement = (service as any).confinement({ path: project, projectDir: project, gitDir: join(project, '.git') })
    assert.ok(confinement)
    assert.ok(!confinement.writable.some((p: string) => p.startsWith(root)), 'source must not be writable')
    const probe = confinedSpawn('touch', [join(root, 'write-probe.tmp')], confinement, { stdio: 'ignore' })
    const probeExit = await new Promise((done) => probe.on('exit', done))
    assert.notEqual(probeExit, 0, 'the sandbox must refuse writes to the design source')
    const child = confinedSpawn(
      process.execPath,
      [join(root, 'start.mjs'), '--root', project, '--port', String(port)],
      confinement,
      { cwd: project, stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, HOME: process.env.HOME, TMPDIR: process.env.TMPDIR } }
    )
    let log = ''
    child.stdout?.on('data', (d) => (log += d))
    child.stderr?.on('data', (d) => (log += d))
    try {
      await until(async () => {
        if (child.exitCode !== null) throw new Error(`design server exited:\n${log}`)
        return fetch(`http://127.0.0.1:${port}/`).then((r) => r.status === 200, () => false)
      }, 60000)
      const page = await fetch(`http://127.0.0.1:${port}/`)
      assert.equal(page.status, 200)
      assert.match(await page.text(), /<div id="root"/)
      assert.equal(listing(root), before, `source dir changed:\n${log}`)
      assert.equal(statSync(root).mtimeMs, mtime)
    } finally {
      child.kill('SIGKILL')
      await rm(base, { recursive: true, force: true })
    }
  })
})
