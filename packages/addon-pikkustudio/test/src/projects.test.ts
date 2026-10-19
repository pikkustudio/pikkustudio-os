import { homedir } from 'node:os'
import assert from 'node:assert'
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync, realpathSync, rmSync } from 'node:fs'
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { StudioProjectsService, cloneProblem, linkedRepos, repoName, type CloudProject, type AccountProvider } from '../../src/services/projects.js'
import { symlink } from 'node:fs/promises'

const fakeAccount = (projects: CloudProject[]): AccountProvider => ({
  account: async () => ({ signedIn: projects.length > 0, apiUrl: 'http://cloud', consoleUrl: 'http://cloud' }),
  projects: async () => projects,
  startSignIn: async () => ({ code: 'ABCD', url: 'http://cloud/cli-auth', expiresAt: new Date().toISOString() }),
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

const git = (cwd: string, ...args: string[]) =>
  execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, stdio: 'pipe' })

const repo = async (base: string, name: string, remote?: string) => {
  const path = join(base, name)
  await mkdir(path, { recursive: true })
  await writeFile(join(path, 'package.json'), JSON.stringify({ name }))
  git(path, 'init', '-q', '-b', 'main')
  git(path, 'add', '-A')
  git(path, 'commit', '-qm', 'init')
  if (remote) git(path, 'remote', 'add', 'origin', remote)
  return path
}

const setup = async (cloud: CloudProject[] = []) => {
  const base = await mkdtemp(join(tmpdir(), 'pikku-studio-projects-'))
  const service = new StudioProjectsService({
    account: fakeAccount(cloud),
    home: join(base, 'studio'),
    projectsDir: join(base, 'studio', 'local'),
    devCommand: () => ({ command: 'sleep', args: ['30'] }),
    serveCommand: () => ({ command: 'sleep', args: ['30'] }),
    stopTimeoutMs: 300,
    installCommand: () => null,
    waitForPort: async () => {},
    createCommand: (name) => ({ command: 'mkdir', args: [name] }),
  })
  return { base, service }
}

describe('StudioProjectsService', () => {
  test('updates the database and commits the migration in the worktree', async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-projects-'))
    const service = new StudioProjectsService({
      account: fakeAccount([]),
      home: join(base, 'studio'),
      databaseCommands: () => [{ command: 'sh', args: ['-c', 'mkdir -p db/sqlite && echo "create table agent_run (id text);" > db/sqlite/0007-pikku-runtime.sql'] }],
      installCommand: () => null,
      confine: false,
    })
    const added = await service.add(await repo(base, 'shop'))
    await service.updateDatabase(added.key)
    const worktree = join(base, 'studio', 'worktrees', added.key)
    const log = execFileSync('git', ['-C', worktree, 'log', '--format=%s', '-1', '--', 'db']).toString().trim()
    assert.equal(log, 'Update the database')
  })

  test('lets a project read the repos its linked packages come from', async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-links-'))
    const other = await repo(base, 'lib')
    await mkdir(join(other, 'packages', 'core'), { recursive: true })
    const app = await repo(base, 'app')
    await mkdir(join(app, 'node_modules', '@acme'), { recursive: true })
    await symlink(join(other, 'packages', 'core'), join(app, 'node_modules', '@acme', 'core'))
    assert.deepEqual(linkedRepos(app), [await import('node:fs').then((fs) => fs.realpathSync(other))])
  })

  test('says why a project stopped while starting', async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-projects-'))
    const service = new StudioProjectsService({
      account: fakeAccount([]),
      home: join(base, 'studio'),
      devCommand: () => ({ command: 'sh', args: ['-c', "echo \"Error: The 'agent' schema is not in this database\" >&2; exit 1"] }),
      installCommand: () => null,
      confine: false,
    })
    const added = await service.add(await repo(base, 'shop'))
    await assert.rejects(service.open(added.key), /stopped while starting:\nError: The 'agent' schema/)
    assert.equal(service.runningProject(added.key), null)
  })

  test('runs the project confined to its worktree', { skip: process.platform !== 'darwin' }, async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-projects-'))
    const outside = join(homedir(), `.pikku-studio-probe-${process.pid}`)
    const service = new StudioProjectsService({
      account: fakeAccount([]),
      home: join(base, 'studio'),
      devCommand: () => ({
        command: 'sh',
        args: ['-c', `touch inside; touch ${outside}; touch done; sleep 30`],
      }),
      installCommand: () => null,
      waitForPort: async () => {},
    })
    const added = await service.add(await repo(base, 'shop'))
    const opened = await service.open(added.key)
    for (let i = 0; i < 100 && !existsSync(join(opened.worktree, 'done')); i++) {
      await new Promise((r) => setTimeout(r, 20))
    }
    service.close(added.key)
    assert.ok(existsSync(join(opened.worktree, 'inside')))
    assert.equal(existsSync(outside), false)
  })

  test('stopping a server takes its helper processes with it, and everything dies with Studio', async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-projects-'))
    const make = () =>
      new StudioProjectsService({
        account: fakeAccount([]),
        home: join(base, 'studio'),
        devCommand: () => ({ command: 'sh', args: ['-c', 'sleep 300 & echo $! > helper.pid; wait'] }),
        installCommand: () => null,
        waitForPort: async () => {},
        startApps: false,
      })
    const gone = async (pid: number) => {
      for (let i = 0; i < 100; i++) {
        try {
          process.kill(pid, 0)
        } catch {
          return true
        }
        await new Promise((r) => setTimeout(r, 20))
      }
      return false
    }
    const helper = async (worktree: string) => {
      for (let i = 0; i < 100 && !existsSync(join(worktree, 'helper.pid')); i++) await new Promise((r) => setTimeout(r, 20))
      await new Promise((r) => setTimeout(r, 50))
      return Number(readFileSync(join(worktree, 'helper.pid'), 'utf8'))
    }
    const service = make()
    const added = await service.add(await repo(base, 'shop'))
    const opened = await service.open(added.key)
    const pid = await helper(opened.worktree)
    await service.stop(added.key)
    assert.ok(await gone(pid))

    rmSync(join(opened.worktree, 'helper.pid'))
    const again = await service.open(added.key)
    const next = await helper(again.worktree)
    service.killAll()
    assert.ok(await gone(next))
  })

  test('opening at the same time starts one server', async () => {
    const { base, service } = await setup()
    const added = await service.add(await repo(base, 'shop'))
    const [a, b, c] = await Promise.all([service.open(added.key), service.open(added.key), service.open(added.key)])
    assert.equal(a.port, b.port)
    assert.equal(b.port, c.port)
    service.close(added.key)
  })

  test('publishing keeps the everyday copy into main and serves main, and later keeps restart it', async () => {
    const { service } = await setup()
    const project = await service.create({ name: 'Plant Diary' })
    const root = join(service['projectsDir'], project.key)
    await writeFile(join(root, 'develop', 'hello.txt'), 'hi\n')
    git(join(root, 'develop'), 'add', 'hello.txt')
    git(join(root, 'develop'), 'commit', '-qm', 'Say hello')
    assert.equal(service.publishedProject(project.key), null)
    const first = await service.publishLocal(project.key)
    assert.equal(first.kept, 1)
    assert.equal(existsSync(join(root, 'main', 'hello.txt')), true)
    assert.equal(service.publishedProject(project.key)?.port, first.port)

    await writeFile(join(root, 'develop', 'more.txt'), 'more\n')
    git(join(root, 'develop'), 'add', 'more.txt')
    git(join(root, 'develop'), 'commit', '-qm', 'More')
    await service.keepChanges(project.key)
    assert.equal(existsSync(join(root, 'main', 'more.txt')), true)
    const second = service.publishedProject(project.key)
    assert.ok(second)
    assert.notEqual(second.port, first.port)
    await service.unpublishLocal(project.key)
    assert.equal(service.publishedProject(project.key), null)
  })

  test('imports a repository that already has a develop branch', async () => {
    const { base, service } = await setup()
    const source = join(base, 'source')
    await mkdir(source, { recursive: true })
    const run = (...a: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { cwd: source })
    run('init', '-q', '-b', 'main')
    await writeFile(join(source, 'a.txt'), 'a')
    run('add', '.')
    run('commit', '-q', '-m', 'one')
    run('branch', 'develop')
    const project = await service.importRepo(source, 'Has Develop')
    assert.ok(project.key)
    assert.ok((await service.list()).some((p) => p.key === project.key))
  })

  test('names a project from its address and explains a clone that fails', async () => {
    for (const [address, name] of [['https://github.com/acme/shop.git', 'shop'], ['git@bitbucket.org:acme/shop-site.git', 'shop-site'], ['ssh://git@host.com/a/b/', 'b']]) assert.equal(repoName(address!), name)
    assert.match(cloneProblem({ stderr: 'git@github.com: Permission denied (publickey).' }), /git sign-in/)
    assert.match(cloneProblem({ stderr: "fatal: could not read Username for 'https://github.com': terminal prompts disabled" }), /git sign-in/)
    assert.match(cloneProblem({ stderr: 'remote: Repository not found.\nfatal: repository ... not found' }), /could not find/)
    const { base, service } = await setup()
    await assert.rejects(service.importRepo(join(base, 'nowhere.git')), /could not find/)
    await assert.rejects(service.importRepo('  '), /Paste the address/)
    await assert.rejects(service.importRepo('--upload-pack=touch /tmp/x'), /Paste the address/)
    assert.equal((await service.list()).length, 0)
  })

  test('imports a repository into main and develop, and pushes main back', async () => {
    const { base, service } = await setup()
    const remote = join(base, 'remote.git')
    const seed = await repo(base, 'seed')
    git(base, 'clone', '-q', '--bare', seed, remote)
    const project = await service.importRepo(remote, 'Seed')
    const root = join(service['projectsDir'], project.key)
    assert.equal(existsSync(join(root, 'main', 'package.json')), true)
    assert.equal(existsSync(join(root, 'develop', 'package.json')), true)
    assert.deepEqual((await service.list()).find((p) => p.key === project.key)?.worktrees, ['develop'])
    await assert.rejects(service.importRepo(remote, 'Seed'))

    await writeFile(join(root, 'develop', 'new.txt'), 'x\n')
    git(join(root, 'develop'), 'add', 'new.txt')
    git(join(root, 'develop'), 'commit', '-qm', 'New file')
    await service.keepChanges(project.key)
    const pushed = await service.pushAll(project.key)
    assert.equal(pushed.pushed, true)
    assert.match(git(remote, 'log', '--oneline', 'main').toString(), /New file/)
  })

  test('links a local project to a remote and sends every branch there', async () => {
    const { base, service } = await setup()
    const remote = join(base, 'empty.git')
    git(base, 'init', '-q', '--bare', remote)
    const project = await service.create({ name: 'Plant Diary' })
    assert.deepEqual(await service.pushAll(project.key), { pushed: false, remote: '', branches: [] })
    const linked = await service.linkRepo(project.key, remote)
    assert.equal(linked.remote, remote)
    assert.match(git(remote, 'log', '--oneline', 'main').toString(), /Start/)
    assert.equal(linked.branches.includes('develop'), true)
    assert.match(git(remote, 'branch').toString(), /develop/)
    await assert.rejects(service.linkRepo(project.key, join(base, 'other.git')), /already connected/)
    assert.equal((await service.linkRepo(project.key, remote)).pushed, true)
  })

  test('a failed link leaves the project unconnected', async () => {
    const { base, service } = await setup()
    const project = await service.create({ name: 'Plant Diary' })
    await assert.rejects(service.linkRepo(project.key, join(base, 'nowhere.git')))
    assert.equal((await service.pushAll(project.key)).pushed, false)
  })

  test('lists local, cloud and both', async () => {
    const shop: CloudProject = { projectId: 'p-shop', name: 'Shop', slug: 'shop', productionBranch: 'main', gitRepoUrl: 'https://github.com/acme/shop.git' }
    const blog: CloudProject = { projectId: 'p-blog', name: 'Blog', slug: 'blog', productionBranch: 'main', gitRepoUrl: 'https://github.com/acme/blog' }
    const { base, service } = await setup([shop, blog])
    await service.add(await repo(base, 'notes'))
    await service.add(await repo(base, 'shop', 'git@github.com:acme/shop.git'))
    const projects = await service.list()
    const by = Object.fromEntries(projects.map((p) => [p.name, p]))
    assert.equal(by.notes.location, 'local')
    assert.equal(by.Shop.location, 'both')
    assert.equal(by.Shop.cloudProjectId, 'p-shop')
    assert.equal(by.Blog.location, 'cloud')
    assert.equal(by.Blog.path, null)
    assert.equal(projects.length, 3)
  })

  test('adding the same folder twice keeps one entry', async () => {
    const { base, service } = await setup()
    const path = await repo(base, 'notes')
    await service.add(path)
    await service.add(path)
    assert.equal((await service.list()).length, 1)
  })

  test('an interview project counts exactly five answers and then finishes the questions', async () => {
    const { service } = await setup()
    const project = await service.create({ name: 'Plant Diary', idea: 'Log my watering', path: 'interview' })
    assert.deepEqual((await service.intake(project.key))?.skipped, [])
    for (let n = 1; n <= 4; n++) assert.equal(await service.recordAnswer(project.key, `q${n}`, `a${n}`), n)
    assert.equal((await service.intake(project.key))?.done, false)
    assert.equal(await service.recordAnswer(project.key, 'q5', '', true), 5)
    const done = await service.intake(project.key)
    assert.equal(done?.done, true)
    assert.equal(done?.answers[4].skipped, true)
    assert.equal(await service.recordAnswer(project.key, 'q6', 'a6'), 5)
    assert.equal((await service.intake(project.key))?.answers.length, 5)
  })

  test('a design-first project starts with the questions skipped, and skips can be undone', async () => {
    const { service } = await setup()
    const project = await service.create({ name: 'Plant Diary', idea: 'Log my watering' })
    assert.deepEqual((await service.intake(project.key))?.skipped, ['questions'])
    await service.setSkipped(project.key, 'tests', true)
    await service.setSkipped(project.key, 'tests', true)
    assert.deepEqual((await service.intake(project.key))?.skipped, ['questions', 'tests'])
    await service.setSkipped(project.key, 'tests', false)
    assert.deepEqual((await service.intake(project.key))?.skipped, ['questions'])
    await service.reopenQuestions(project.key)
    const reopened = await service.intake(project.key)
    assert.equal(reopened?.path, 'interview')
    assert.equal(reopened?.done, false)
    assert.deepEqual(reopened?.skipped, [])
    await service.noteRun(project.key, 'run-1')
    await service.noteJob(project.key, 'backend')
    await service.setSamples(project.key, true)
    const noted = await service.intake(project.key)
    assert.equal(noted?.run?.id, 'run-1')
    assert.ok(noted?.jobs.backend)
    assert.equal(noted?.samples, true)
  })

  test('a project that already exists starts its interview from an idea', async () => {
    const { base, service } = await setup()
    await service.add(await repo(base, 'workspace'), 'app')
    assert.equal(await service.intake('app'), null)
    await service.beginIntake('app', { idea: 'Log my watering', surfaces: ['screens'], path: 'interview' })
    const started = await service.intake('app')
    assert.equal(started?.path, 'interview')
    assert.equal(started?.idea, 'Log my watering')
    assert.equal(started?.done, false)
    assert.deepEqual(started?.skipped, [])
  })

  test('creates a project and records the idea', async () => {
    const { base, service } = await setup()
    const project = await service.create({ name: 'Plant Diary', idea: 'Log my watering' })
    assert.equal(project.path, join(base, 'studio', 'local', project.key, 'main'))
    const file = JSON.parse(await readFile(join(project.path!, '.studio', 'project.json'), 'utf8'))
    assert.deepEqual(file, { name: 'Plant Diary', idea: 'Log my watering' })
    assert.equal(project.name, 'Plant Diary')
    const opened = await service.open(project.key)
    assert.equal(opened.worktree, join(base, 'studio', 'local', project.key, 'develop'))
    assert.ok(existsSync(join(opened.worktree, '.studio', 'project.json')))
    service.close(project.key)
    await assert.rejects(service.create({ name: 'Plant Diary' }))
  })

  test('named worktrees branch from develop and keep into develop, then develop keeps into main', async () => {
    const { base, service } = await setup()
    const project = await service.create({ name: 'Plant Diary' })
    const root = join(base, 'studio', 'local', project.key)
    assert.deepEqual(await service.worktrees(project.key), ['develop'])
    assert.deepEqual((await service.createWorktree(project.key, 'footer')).sort(), ['develop', 'footer'])
    const listed = (await service.list()).find((p) => p.key === project.key)
    assert.deepEqual(listed?.worktrees.sort(), ['develop', 'footer'])
    await assert.rejects(service.createWorktree(project.key, 'main'))
    await assert.rejects(service.createWorktree(project.key, 'footer'))
    await writeFile(join(root, 'footer', 'footer.txt'), 'hi')
    assert.deepEqual(await service.keepChanges(`${project.key}.footer`), { ok: true, kept: 1 })
    assert.ok(existsSync(join(root, 'develop', 'footer.txt')))
    assert.equal(existsSync(join(root, 'main', 'footer.txt')), false)
    assert.deepEqual(await service.keepChanges(project.key), { ok: true, kept: 1 })
    assert.ok(existsSync(join(root, 'main', 'footer.txt')))
  })

  test('a session is its own worktree with its own launch, server and keep', async () => {
    const { base, service } = await setup()
    const project = await service.create({ name: 'Plant Diary' })
    const root = join(base, 'studio', 'local', project.key)
    const session = await service.createSession(project.key, 'tidy')
    assert.equal(session, `${project.key}.tidy`)
    assert.ok((await service.createSession(project.key)).startsWith(`${project.key}.s-`))
    assert.ok((await service.keys()).includes(session))
    assert.equal((await service.builderLaunch(session)).cwd, join(root, 'tidy'))
    assert.equal((await service.builderLaunch(project.key)).cwd, join(root, 'develop'))
    const opened = await service.open(session)
    assert.equal(opened.worktree, join(root, 'tidy'))
    assert.deepEqual(service.openKeys(), [session])
    service.close(session)
    await writeFile(join(root, 'tidy', 'tidy.txt'), 'x')
    const status = await service.keepStatus(session)
    assert.equal(status.folder, realpathSync(join(root, 'develop')))
    assert.equal(status.unsaved, 1)
    await assert.rejects(service.open(`${project.key}.missing`))
  })

  test('a server counts as used when opened, touched, and not once stopped', async () => {
    const { service } = await setup()
    const project = await service.create({ name: 'Plant Diary' })
    await service.open(project.key)
    assert.ok(service.idleFor(project.key) < 5_000)
    assert.ok(service.idleFor(project.key, Date.now() + 60_000) >= 60_000)
    assert.equal(service.isKeeping(), false)
    service.close(project.key)
    assert.ok(service.idleFor(project.key) > 1_000_000)
  })

  test('clones a cloud project and links it', async () => {
    const { base } = await setup()
    const origin = await repo(base, 'origin-blog')
    const { service } = await setup([{ projectId: 'p-blog', name: 'Blog', slug: 'blog', productionBranch: 'main', gitRepoUrl: origin }])
    const project = await service.clone('p-blog')
    assert.equal(project.location, 'both')
    assert.ok(existsSync(join(project.path!, 'package.json')))
    const config = JSON.parse(await readFile(join(project.path!, 'pikku.config.json'), 'utf8'))
    assert.equal(config.cloud.projectId, 'p-blog')
    const opened = await service.open(project.key)
    assert.match(await readFile(join(opened.worktree, 'pikku.config.json'), 'utf8'), /p-blog/)
    service.close(project.key)
    assert.equal((await service.list()).filter((p) => p.cloudProjectId === 'p-blog').length, 1)
  })

  test('opens a project in a subfolder of a bigger repo at that subfolder', async () => {
    const { base, service } = await setup()
    const mono = await repo(base, 'mono')
    await mkdir(join(mono, 'apps', 'shop'), { recursive: true })
    await writeFile(join(mono, 'apps', 'shop', 'package.json'), JSON.stringify({ name: 'shop' }))
    git(mono, 'add', '-A')
    git(mono, 'commit', '-qm', 'shop')
    const added = await service.add(join(mono, 'apps', 'shop'))
    assert.equal(added.name, 'shop')
    const opened = await service.open(added.key)
    assert.equal(opened.worktree, join(base, 'studio', 'worktrees', added.key, 'apps', 'shop'))
    assert.ok(existsSync(join(opened.worktree, 'package.json')))
    assert.equal(existsSync(join(mono, 'apps', 'shop', '.git')), false)
    service.close(added.key)
  })

  test('opens a project in its own worktree and closes it', async () => {
    const { base, service } = await setup()
    const added = await service.add(await repo(base, 'notes'))
    const opened = await service.open(added.key)
    assert.equal(opened.worktree, join(base, 'studio', 'worktrees', added.key))
    assert.equal(opened.token.length, 64)
    assert.equal((await service.open(added.key)).port, opened.port)
    assert.equal((await service.list())[0].open, true)
    service.close(added.key)
    assert.equal((await service.list())[0].open, false)
  })

  test('writes the dev overlay under the runtime dir and removes the old root one', async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-projects-'))
    const service = new StudioProjectsService({
      account: fakeAccount([]),
      home: join(base, 'studio'),
      projectsDir: join(base, 'studio', 'local'),
      devCommand: () => ({ command: 'sh', args: ['-c', 'echo "$@" > dev-args.txt; sleep 30', 'sh'] }),
      stopTimeoutMs: 300,
      installCommand: () => null,
      waitForPort: async () => {},
      startApps: false,
      devContributors: ['/x/inbox.contributor.ts'],
    })
    const path = await repo(base, 'notes')
    await writeFile(join(path, 'pikku.config.json'), JSON.stringify({ runtimeDir: 'var/run', dev: { contributors: [{ module: './own.ts' }] } }))
    git(path, 'add', '-A')
    git(path, 'commit', '-qm', 'config')
    const added = await service.add(path)
    const opened = await service.open(added.key)
    const projectDir = opened.worktree
    await writeFile(join(projectDir, '__pikku_studio.pikku.config.json'), '{}')
    service.close(added.key)
    await service.open(added.key)
    const overlay = join(projectDir, 'var', 'run', 'studio', 'pikku.config.json')
    for (let i = 0; i < 50 && !existsSync(join(projectDir, 'dev-args.txt')); i++) await new Promise((r) => setTimeout(r, 50))
    assert.equal(readFileSync(join(projectDir, 'dev-args.txt'), 'utf8').trim(), `--config ${overlay}`)
    assert.deepEqual(JSON.parse(readFileSync(overlay, 'utf8')), {
      extends: '../../../pikku.config.json',
      dev: { contributors: [{ module: './own.ts' }, { module: '/x/inbox.contributor.ts' }] },
    })
    assert.equal(existsSync(join(projectDir, '__pikku_studio.pikku.config.json')), false)
    service.close(added.key)
  })

  test('stops an open project gracefully and says which were open', async () => {
    const { base, service } = await setup()
    const added = await service.add(await repo(base, 'notes'))
    await service.open(added.key)
    assert.deepEqual(await service.keys(), [added.key])
    assert.deepEqual(service.openKeys(), [added.key])
    await service.settle()
    await service.stop(added.key, 2000)
    assert.deepEqual(service.openKeys(), [])
    assert.equal(service.runningProject(added.key), null)
  })
})

describe('projectEnv', () => {
  test('generates the auth secrets once and lets the project .env win', async () => {
    const home = await mkdtemp(join(tmpdir(), 'studio-env-'))
    const project = await mkdtemp(join(tmpdir(), 'studio-env-project-'))
    await writeFile(join(project, '.env'), 'BETTER_AUTH_SECRET="mine"\nAPI_KEY=abc\n')
    const projects = new StudioProjectsService({ home })
    const first = await projects.projectEnv('p1', project)
    assert.equal(first.BETTER_AUTH_SECRET, 'mine')
    assert.equal(first.API_KEY, 'abc')
    assert.ok(first.SCENARIO_ACTOR_SECRET!.length >= 32)
    const second = await projects.projectEnv('p1', project)
    assert.equal(second.SCENARIO_ACTOR_SECRET, first.SCENARIO_ACTOR_SECRET)
    assert.equal(await readFile(join(project, '.env'), 'utf8'), 'BETTER_AUTH_SECRET="mine"\nAPI_KEY=abc\n')
  })

  test('registers a project under the key it is given, and keeps it', async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-key-'))
    const service = new StudioProjectsService({ account: fakeAccount([]), home: join(base, 'studio'), confine: false })
    const path = await repo(base, 'shop')
    assert.equal((await service.add(path, 'app')).key, 'app')
    assert.equal((await service.add(path, 'app')).key, 'app')
    assert.equal((await service.list()).filter((p) => p.path === path).length, 1)
    await assert.rejects(service.add(await repo(base, 'other'), 'app'), /already taken/)
  })

  test('scaffolds from the starter template', async () => {
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-starter-'))
    const starter = join(base, 'starter')
    await mkdir(join(starter, 'apps', 'app'), { recursive: true })
    await writeFile(join(starter, 'package.json'), JSON.stringify({ name: 'starter' }))
    await writeFile(join(starter, 'apps', 'app', 'AGENTS.md'), '# rules\n')
    process.env.PIKKU_STARTER_TEMPLATE = starter
    try {
      const service = new StudioProjectsService({
        account: fakeAccount([]),
        home: join(base, 'studio'),
        projectsDir: join(base, 'studio', 'local'),
        installCommand: () => null,
        confine: false,
      })
      const project = await service.create({ name: 'Pen shop' })
      assert.ok(existsSync(join(project.path, 'apps', 'app', 'AGENTS.md')))
    } finally {
      delete process.env.PIKKU_STARTER_TEMPLATE
    }
  })
})
