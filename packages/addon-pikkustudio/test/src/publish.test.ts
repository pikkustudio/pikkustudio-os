import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { StudioProjectsService, type AccountProvider, type OnlineProject } from '../../src/services/projects.js'

const target: PublishTarget = {
  id: 'cloud',
  readiness: (project, account) => (!account.signedIn ? 'sign-in' : !project.cloudProjectId ? 'not-in-cloud' : 'ready'),
  deploy: (from, run, onLine) => run('npx', ['pikku', 'cloud', 'deploy', 'apply', '-y'], from, onLine),
}
import { publishPrompt, StudioPublisher, type PublishTarget, type Runner } from '../../src/services/publish.js'

const shop: OnlineProject = { projectId: 'p-shop', name: 'Shop', slug: 'shop', productionBranch: 'main', gitRepoUrl: 'https://github.com/acme/shop.git' }

const account = (signedIn: boolean, cloud: OnlineProject[]): AccountProvider => ({
  account: async () => ({ signedIn, apiUrl: 'http://cloud', consoleUrl: 'http://cloud/console' }),
  projects: async () => cloud,
  startSignIn: async () => ({ code: 'ABCD', url: 'http://cloud', expiresAt: new Date().toISOString() }),
  pollSignIn: async () => 'confirmed',
  locate: async (path, cloud) => {
    try {
      const projectId = JSON.parse(await readFile(join(path, 'pikku.config.json'), 'utf8')).cloud?.projectId as string | undefined
      if (projectId) return { projectId, project: cloud.find((p) => p.projectId === projectId) ?? null }
    } catch {}
    try {
      const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { cwd: path, stdio: 'pipe' }).toString().trim()
      const norm = (url: string) => url.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '').toLowerCase()
      const project = cloud.find((p) => p.gitRepoUrl && norm(p.gitRepoUrl) === norm(remote)) ?? null
      return project ? { projectId: project.projectId, project } : null
    } catch {
      return null
    }
  },
  adopt: async (projectId, path) => {
    await writeFile(join(path, 'pikku.config.json'), JSON.stringify({ cloud: { projectId } }, null, 2) + '\n')
  },
  signOut: async () => {},
})

const setup = async (signedIn: boolean, cloud: OnlineProject[], remote?: string) => {
  const base = await mkdtemp(join(tmpdir(), 'pikku-studio-publish-'))
  const path = join(base, 'shop')
  await mkdir(path)
  await writeFile(join(path, 'package.json'), JSON.stringify({ name: 'shop' }))
  const git = (...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: path, stdio: 'pipe' })
  git('init', '-q', '-b', 'main')
  git('add', '-A')
  git('commit', '-qm', 'init')
  if (remote) git('remote', 'add', 'origin', remote)
  const projects = new StudioProjectsService({
    account: account(signedIn, cloud),
    home: join(base, 'studio'),
    devCommand: () => ({ command: 'sleep', args: ['30'] }),
    installCommand: () => null,
    waitForPort: async () => {},
    confine: false,
  })
  const added = await projects.add(path)
  return { projects, key: added.key }
}

const until = async (check: () => boolean) => {
  for (let i = 0; i < 100 && !check(); i++) await new Promise((r) => setTimeout(r, 10))
}

const noMocks = async () => ''

describe('StudioPublisher', () => {
  test('says what Pikku Studio Cloud needs before it can publish', async () => {
    const local = await setup(false, [])
    assert.equal((await new StudioPublisher(local.projects, [target]).options(local.key)).targets.cloud, 'sign-in')
    const signedIn = await setup(true, [shop])
    assert.equal((await new StudioPublisher(signedIn.projects, [target]).options(signedIn.key)).targets.cloud, 'not-in-cloud')
    await assert.rejects(new StudioPublisher(signedIn.projects, [target]).deploy(signedIn.key, 'cloud'))
  })

  test('publishes a Pikku Studio Cloud project by pushing its work and deploying it', async () => {
    const { projects, key } = await setup(true, [shop], 'git@github.com:acme/shop.git')
    const calls: string[] = []
    const run: Runner = async (command, args, cwd, onLine) => {
      calls.push(`${command} ${args.join(' ')}`)
      assert.match(cwd, /worktrees/)
      if (command === 'npx') onLine('Live at https://shop-main.pikku.app')
    }
    const publisher = new StudioPublisher(projects, [target], run, noMocks)
    assert.equal((await publisher.options(key)).targets.cloud, 'ready')
    assert.equal((await publisher.deploy(key, 'cloud')).state, 'running')
    await until(() => publisher.status(key).state !== 'running')
    projects.closeAll()
    const job = publisher.status(key)
    assert.equal(job.state, 'done')
    assert.equal(job.phase, 'deploy')
    assert.ok(job.startedAt)
    assert.deepEqual(calls.map((c) => c.split(' ').slice(0, 2).join(' ')), ['git add', 'git -c', 'git push', 'npx pikku'])
    assert.equal(calls[3], 'npx pikku cloud deploy apply -y')
  })

  test('reports a failed step', async () => {
    const { projects, key } = await setup(true, [shop], 'https://github.com/acme/shop')
    const publisher = new StudioPublisher(projects, [target], async (command) => {
      if (command === 'git') throw new Error('push rejected')
    }, noMocks)
    await publisher.deploy(key, 'cloud')
    await until(() => publisher.status(key).state !== 'running')
    projects.closeAll()
    assert.deepEqual([publisher.status(key).state, publisher.status(key).error, publisher.status(key).phase], ['failed', 'push rejected', 'save'])
  })

  test('every other cloud gets a setup prompt naming its adapter', () => {
    for (const [target, pkg] of [
      ['standalone', '@pikku/deploy-standalone'],
      ['cloudflare', '@pikku/deploy-cloudflare'],
      ['serverless', '@pikku/deploy-serverless'],
      ['azure', '@pikku/deploy-azure'],
    ] as const) {
      const prompt = publishPrompt(target, 'Shop')
      assert.match(prompt, new RegExp(pkg.replace('/', '\\/')))
      assert.match(prompt, new RegExp(`--provider ${target}`))
      assert.match(prompt, /"Shop"/)
    }
  })

  test('stops before pushing while a screen still shows unflagged sample data', async () => {
    const { projects, key } = await setup(true, [shop], 'https://github.com/acme/shop')
    const calls: string[] = []
    const mocks = async () => JSON.stringify({ ok: false, calls: [{ file: 'apps/app/src/routes/app.book.tsx', rpc: 'bookings:list', problem: 'no-flag' }] })
    const publisher = new StudioPublisher(projects, [target], async (command) => void calls.push(command), mocks)
    await publisher.deploy(key, 'cloud')
    await until(() => publisher.status(key).state !== 'running')
    projects.closeAll()
    assert.equal(publisher.status(key).state, 'failed')
    assert.match(publisher.status(key).error ?? '', /app\.book\.tsx/)
    assert.deepEqual(calls, [])
  })

  test('publishes when the check passes or cannot run', async () => {
    for (const out of [JSON.stringify({ ok: true, calls: [] }), 'Usage: pikku <command>']) {
      const { projects, key } = await setup(true, [shop], 'https://github.com/acme/shop')
      const publisher = new StudioPublisher(projects, [target], async () => {}, async () => out)
      await publisher.deploy(key, 'cloud')
      await until(() => publisher.status(key).state !== 'running')
      projects.closeAll()
      assert.equal(publisher.status(key).state, 'done')
    }
  })
})
