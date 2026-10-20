import assert from 'node:assert'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { execFileSync } from 'node:child_process'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, before, describe, test } from 'node:test'
import { StudioProjectsService, type AccountProvider, type SourceProject } from '../../src/services/projects.js'
import { StudioPublisher } from '../../src/services/publish.js'
import { projectLogEntries } from '../../src/functions/project-log-entries.function.js'
import { pickSource } from '../../src/lib/target-sources.js'
import type { LogSource } from '../../src/services/log-source.js'

const held: SourceProject = { projectId: 'p1', name: 'Bakery', gitRepoUrl: null }

// A workspace's Studio: answers listProjects and whatever `answers` holds; any other call is a 404 with the body Pikku
// gives a route it has no wiring for, as an older Studio without that call answers.
const answers: Record<string, unknown> = {}
const asked: { name: string; body: Record<string, unknown> }[] = []
let failWith: number | null = null
let failBody: string | null = null
const workspace = createServer((req: IncomingMessage, res: ServerResponse) => {
  let raw = ''
  req.on('data', (chunk) => (raw += chunk))
  req.on('end', () => {
    const name = (req.url ?? '').replace(/^\/studio\//, '')
    asked.push({ name, body: raw ? JSON.parse(raw) : {} })
    res.setHeader('content-type', 'application/json')
    if (name === 'listProjects') return void res.end(JSON.stringify({ projects: [{ key: 'app' }] }))
    if (failWith) {
      res.statusCode = failWith
      return void res.end(failBody ?? JSON.stringify({ error: 'boom' }))
    }
    if (!(name in answers)) {
      res.statusCode = 404
      return void res.end(JSON.stringify({ name: 'NotFoundError', message: 'The server cannot find the requested resource.', errorId: 'e1' }))
    }
    res.end(JSON.stringify(answers[name]))
  })
})
let url = ''

const source = (state: 'ready' | 'off' = 'ready'): AccountProvider => ({
  account: async () => ({ signedIn: true, apiUrl: 'http://host', consoleUrl: 'http://host/console' }),
  projects: async () => [held],
  startSignIn: async () => ({ code: 'ABCD', url: 'http://host/cli-auth', expiresAt: new Date().toISOString() }),
  pollSignIn: async () => 'confirmed',
  locate: async () => null,
  adopt: async () => {},
  signOut: async () => {},
  modelAccess: async () => ({ proxyUrl: '', apiKey: '' }),
  link: async () => null,
  workspaceLink: async () => (state === 'ready' ? { state, url, token: 'tok' } : { state: 'off', url: '' }) as never,
})

const service = async (state: 'ready' | 'off' = 'ready') => {
  const base = await mkdtemp(join(tmpdir(), 'pikku-studio-deleg-'))
  return new StudioProjectsService({ sources: { host: source(state) }, home: join(base, 'studio'), startApps: false })
}

const KEY = 'host:p1@ws'
const reset = () => {
  for (const k of Object.keys(answers)) delete answers[k]
  asked.length = 0
  failWith = null
  failBody = null
}

describe('a source project is answered by its workspace', () => {
  before(async () => {
    await new Promise<void>((done) => workspace.listen(0, '127.0.0.1', done))
    url = `http://127.0.0.1:${(workspace.address() as { port: number }).port}`
  })
  after(() => workspace.close())

  test('an older workspace Studio without the call (404) is "the workspace doesn\'t have this", other errors stay loud', async () => {
    reset()
    const studio = await service()
    assert.strictEqual(await studio.workspaceStudio(KEY, 'projectMetricsSummary', {}), null)
    failWith = 500
    await assert.rejects(studio.workspaceStudio(KEY, 'projectMetricsSummary', {}), /The workspace answered 500/)
  })

  test('a 404 from a call that ran, or from something in front of the workspace, is a failure, not a missing call', async () => {
    reset()
    const studio = await service()
    failWith = 404
    failBody = JSON.stringify({ name: 'NotFoundError', message: 'No project app here', errorId: 'e2' })
    await assert.rejects(studio.workspaceStudio(KEY, 'projectLogEntries', {}), /The workspace answered 404: No project app here/)
    failBody = 'no such host'
    await assert.rejects(studio.workspaceStudio(KEY, 'projectLogEntries', {}), /The workspace answered 404/)
    failBody = JSON.stringify({ name: 'NotFoundError', message: 'The server cannot find the requested resource.', payload: { id: 'x' } })
    await assert.rejects(studio.workspaceStudio(KEY, 'projectLogEntries', {}), /The workspace answered 404/)
  })

  test("the key's own workspace is asked for its logs before a contributed sandbox source", () => {
    const sandbox = { name: 'sandbox source' }
    const local = { name: 'local source' }
    const sources = { workspace: local, sandbox }
    assert.deepStrictEqual(pickSource(sources, KEY, { kind: 'workspace', name: 'ws' }), { kind: 'sandbox', delegate: true, fallback: sandbox })
    assert.deepStrictEqual(pickSource(sources, KEY, { kind: 'workspace', name: 'local' }), { kind: 'workspace', delegate: true })
    assert.deepStrictEqual(pickSource(sources, KEY, { kind: 'workspace', name: 'other' }), { kind: 'sandbox', source: sandbox })
    assert.deepStrictEqual(pickSource({ workspace: local }, KEY, { kind: 'workspace', name: 'ws' }), { kind: 'sandbox', delegate: true })
    assert.deepStrictEqual(pickSource(sources, 'local-one', { kind: 'workspace', name: 'local' }), { kind: 'workspace', source: local })
  })

  describe('logs of a source project in its workspace', () => {
    const line = { timestamp: new Date(1000).toISOString(), level: 'info' as const, functionName: 'hello', message: 'from telemetry', wire: null, ms: null }
    const sandbox: LogSource = { list: async () => [line], failures: async () => [] }
    const logsOf = (studio: StudioProjectsService) =>
      (projectLogEntries as unknown as { func: (s: object, i: object, w: object) => Promise<{ logs: { message: string }[]; facets: unknown }> }).func(
        { logSources: { sandbox }, studioProjects: studio },
        { key: KEY, target: { kind: 'workspace', name: 'ws' }, minutes: 60, limit: 10 },
        { session: {} },
      )

    test('come from the Studio in the workspace, asked with its own key and the same filters', async () => {
      reset()
      const facets = { levels: { error: 0, warn: 0, info: 1 }, functions: ['hello'], wires: [] }
      answers.projectLogEntries = { logs: [{ ...line, message: 'from the workspace' }], facets, kinds: ['workspace'] }
      const out = await logsOf(await service())
      assert.deepStrictEqual(out.logs.map((l) => l.message), ['from the workspace'])
      assert.deepStrictEqual(out.facets, facets)
      const body = asked.find((a) => a.name === 'projectLogEntries')?.body
      assert.strictEqual(body?.key, 'app')
      assert.deepStrictEqual(body?.target, { kind: 'workspace', name: 'local' })
      assert.strictEqual(body?.limit, 10)
      assert.ok(typeof body?.since === 'string')
    })

    test('come from the contributed sandbox source while the workspace is off, without asking it', async () => {
      reset()
      const out = await logsOf(await service('off'))
      assert.deepStrictEqual(out.logs.map((l) => l.message), ['from telemetry'])
      assert.deepStrictEqual(asked, [])
    })

    test('surface a workspace failure instead of answering empty', async () => {
      reset()
      failWith = 404
      failBody = JSON.stringify({ name: 'NotFoundError', message: 'No project app here' })
      await assert.rejects(logsOf(await service()), /The workspace answered 404: No project app here/)
    })
  })

  test('the workspace is asked with its own key for the project', async () => {
    reset()
    answers.projectDisk = { packagesMb: 1, codeMb: 2, mediaMb: 3, otherMb: 4, freeMb: 5, skipped: 0 }
    const studio = await service()
    assert.deepStrictEqual(await studio.disk(KEY), answers.projectDisk)
    assert.deepStrictEqual(asked.find((a) => a.name === 'projectDisk')?.body, { key: 'app' })
  })

  test('disk, logs, apps, meta and UI files come from the workspace, empty when it has no such call', async () => {
    reset()
    const studio = await service()
    assert.strictEqual(await studio.disk(KEY), null)
    assert.deepStrictEqual(await studio.logs(KEY), { sources: [] })
    assert.deepStrictEqual(await studio.appsOf(KEY), [])
    assert.strictEqual(await studio.projectMeta(KEY), null)
    assert.deepStrictEqual(await studio.projectUiFiles(KEY), [])

    answers.projectLogs = { sources: [{ id: 'server', lines: ['up'] }] }
    answers.projectMeta = { hello: { pikkuFuncId: 'hello' } }
    answers.projectUiFiles = [{ path: 'apps/app/src/Home.tsx', content: 'export const Home = () => null' }]
    assert.deepStrictEqual(await studio.logs(KEY), answers.projectLogs)
    assert.deepStrictEqual(await studio.projectMeta(KEY), answers.projectMeta)
    assert.deepStrictEqual(await studio.projectUiFiles(KEY), answers.projectUiFiles)
  })

  test("a workspace's frontends keep their state but not an address only that machine can reach", async () => {
    reset()
    answers.projectApps = [
      { slug: 'app', url: 'http://127.0.0.1:5173', state: 'ready', shot: 'app/desktop/index.png', shotAt: 1 },
      { slug: 'site', url: 'https://site.example.test', state: 'starting', shot: null, shotAt: null },
    ]
    const studio = await service()
    assert.deepStrictEqual(await studio.appsOf(KEY), [
      { slug: 'app', url: null, state: 'ready', shot: null, shotAt: null },
      { slug: 'site', url: 'https://site.example.test', state: 'starting', shot: null, shotAt: null },
    ])
  })

  test('a workspace that is off answers empty without being asked', async () => {
    reset()
    const studio = await service('off')
    assert.deepStrictEqual(await studio.inWorkspace(KEY, 'mockStatus', {}, 'none'), { answer: 'none' })
    assert.deepStrictEqual(asked, [])
  })

  test('a project on this computer is not sent to a workspace', async () => {
    reset()
    const studio = await service()
    assert.strictEqual(await studio.inWorkspace('local-one', 'mockStatus', {}, 'none'), null)
    assert.deepStrictEqual(await studio.appsOf('local-one'), [])
    await assert.rejects(studio.disk('local-one'), /Add the project to Studio/)
    assert.deepStrictEqual(asked, [])
  })

  test("publish options for a source's project come from its workspace, or nowhere to publish from here", async () => {
    reset()
    const studio = await service()
    const publisher = new StudioPublisher(studio, [])
    const empty = await publisher.options(KEY)
    assert.deepStrictEqual(empty.targets, {})
    assert.strictEqual(empty.consoleUrl, 'http://host/console')
    assert.match(empty.prompts.standalone, /"Bakery"/)
    answers.publishOptions = { targets: { host: 'ready' }, consoleUrl: 'http://ws/console', prompts: empty.prompts }
    assert.deepStrictEqual(await publisher.options(KEY), answers.publishOptions)
  })

  test("a project on this computer gives Review its frontend source under apps/, nothing generated or installed", async () => {
    reset()
    const base = await mkdtemp(join(tmpdir(), 'pikku-studio-ui-'))
    const root = join(base, 'shop')
    for (const dir of ['apps/app/src', 'apps/app/node_modules/x', 'apps/app/src/paraglide']) await mkdir(join(root, dir), { recursive: true })
    await writeFile(join(root, 'package.json'), JSON.stringify({ name: 'shop' }))
    await writeFile(join(root, 'apps/app/src/Home.tsx'), 'export const Home = () => null\n')
    await writeFile(join(root, 'apps/app/src/routes.gen.ts'), 'export {}\n')
    await writeFile(join(root, 'apps/app/node_modules/x/index.ts'), 'export {}\n')
    await writeFile(join(root, 'apps/app/src/paraglide/m.ts'), 'export {}\n')
    execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root })
    execFileSync('git', ['add', '-A', '-f'], { cwd: root })
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'init'], { cwd: root })
    const studio = new StudioProjectsService({ home: join(base, 'studio'), startApps: false })
    const { key } = await studio.add(root, 'shop')
    const files = await studio.projectUiFiles(key)
    assert.deepStrictEqual(files.map((f) => f.path), ['apps/app/src/Home.tsx'])
    assert.deepStrictEqual(asked, [])
  })
})
