import { execFile, execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { connect, createServer } from 'node:net'
import { homedir, userInfo } from 'node:os'
import { builderHome, packageRoot, piPackageRoot, type BuilderMode, type Launcher } from '@pikkustudio/builder'
import { modeScope } from './builder-scope.js'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { ConflictError } from '@pikku/core/errors'
import { generatedSource, projectSource, resolveEffective, setMany, toEnv, type ScopedSource } from '../lib/sources/index.js'
import { DEVELOP, MAIN, addWorktree, listWorktrees, layoutRoot, sessionKey, splitSessionKey, cloneLayout, commitPaths, createLayout, ensureWorktree, saveWorktrees, keepChanges, mainEnv, keepStatus, listVersions, listThemes, type ProjectTheme, type VersionCommit, worktreeConfinement, type KeepResult, type KeepStatus, type StudioWorktree } from './worktree.js'
import { canConfine, confinedSpawn, type Confinement } from './confine.js'
import { Supervisor, type ServiceSpec, type ServiceStatus } from '@pikkustudio/supervisor'
import { diskUsage } from './disk.js'
import { linkDevPikku } from './dev-link.js'
import { previewViteConfig } from './vite-preview.js'

const execFileAsync = promisify(execFile)

/** Where a project is: on this computer, held by the account host (online, from the contributed AccountProvider), or both. */
export type ProjectLocation = 'local' | 'online' | 'both'

const RESERVED_SLUGS = new Set(['projects', 'secrets', 'new-project', 'sign-in', 'your-name', 'choose-ai'])
const projectSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export type StartPath = 'interview' | 'design'

export const QUESTIONS = 5

export type ChecklistStepId = 'questions' | 'explore' | 'frontend' | 'backend' | 'tests' | 'publish'

export interface IntakeAnswer {
  question: string
  answer: string
  skipped: boolean
}

export interface Intake {
  path: StartPath
  done: boolean
  idea: string | null
  surfaces: string[]
  devices: string[]
  answers: IntakeAnswer[]
  skipped: ChecklistStepId[]
  run: { id: string; at: number } | null
  jobs: Partial<Record<'frontend' | 'backend' | 'tests' | 'prep', number>>
  samples: boolean
}

export const EMPTY_INTAKE: Intake = { path: null as never, done: false, idea: null, surfaces: [], devices: [], answers: [], skipped: [], run: null, jobs: {}, samples: false }

export interface StudioProject {
  key: string
  owner: string
  slug: string
  name: string
  location: ProjectLocation
  path: string | null
  cloudProjectId: string | null
  gitRepoUrl: string | null
  current: boolean
  missing: boolean
  open: boolean
  worktrees: string[]
}

export interface RunningProject {
  port: number
  token: string
  worktree: string
}

export interface ProjectApp {
  slug: string
  url: string | null
  state: 'starting' | 'ready' | 'failed'
  shot?: string | null
  shotAt?: number | null
}

export interface ProjectDesign {
  state: ServiceStatus['state']
  url: string
  restarts: number
  lastExit: ServiceStatus['lastExit']
  logTail: string
}

type RunningApp = ProjectApp & { child: ChildProcess | null; dir: string }

const manifestApps = (manifestPath: string, dir: string): RunningApp[] => {
  try {
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as { sandboxHostname?: string | null; frontends?: Array<{ slug: string; primary?: boolean; system?: boolean }> }
    if (!manifest.sandboxHostname) return []
    const origin = `${manifest.sandboxHostname.includes(':') ? 'http' : 'https'}://${manifest.sandboxHostname}`
    return (manifest.frontends ?? [])
      .filter((app) => !app.system)
      .map((app) => ({ slug: app.slug, url: app.primary ? `${origin}/` : `${origin}/_frontend/${app.slug}/`, state: 'ready', child: null, dir }))
  } catch {
    return []
  }
}

const latestShot = (dir: string, slug: string): { shot: string; shotAt: number } | null => {
  const folder = join(dir, '.pikku', 'builder', 'looks', slug, 'desktop')
  try {
    const files = readdirSync(folder).filter((f) => f.endsWith('.png')).sort()
    const file = files.includes('index.png') ? 'index.png' : files[0]
    return file ? { shot: `${slug}/desktop/${file}`, shotAt: statSync(join(folder, file)).mtimeMs } : null
  } catch {
    return null
  }
}

const GENERATED_SECRETS = ['BETTER_AUTH_SECRET', 'SCENARIO_ACTOR_SECRET']

const VITE_CONFIGS = ['vite.config.ts', 'vite.config.mjs', 'vite.config.js']
const OLD_PREVIEW_CONFIG = '__pikku_studio.vite.config.mjs'
const OLD_DEV_CONFIG = '__pikku_studio.pikku.config.json'

export const studioRuntimeDir = (projectDir: string): string => {
  let config: { rootDir?: string; runtimeDir?: string } = {}
  try {
    config = JSON.parse(readFileSync(join(projectDir, 'pikku.config.json'), 'utf8'))
  } catch {}
  return resolve(projectDir, config.rootDir ?? '.', config.runtimeDir ?? '.pikku-runtime', 'studio')
}

export interface OnlineProject {
  projectId: string
  name: string
  gitRepoUrl: string | null
  productionBranch?: string
}

export interface StudioAccount {
  signedIn: boolean
  handle?: string
  apiUrl: string
  consoleUrl: string
}

export type SignInStatus = 'pending' | 'confirmed' | 'expired' | 'rejected'

export interface AccountProvider {
  account(): Promise<StudioAccount>
  /** The projects the account holds online: one team's, by its slug, or every team's. */
  projects(team?: string): Promise<OnlineProject[]>
  startSignIn(): Promise<{ code: string; url: string; expiresAt: string }>
  pollSignIn(code: string): Promise<SignInStatus>
  signOut(): Promise<void>
  modelAccess(): Promise<{ proxyUrl: string; apiKey: string }>
  /** The model account AI runs, through `modelAccess`, when PIKKU_STUDIO_MODEL does not name one. */
  model?: string
  link(projectId: string): Promise<AccountLink | null>
  locate(path: string, online: OnlineProject[]): Promise<{ projectId: string; project: OnlineProject | null } | null>
  adopt(projectId: string, path: string): Promise<void>
  /** Opens a project's online workspace: creates it when there is none and wakes it when it sleeps. */
  workspaceLink?(projectId: string, workspace?: string): Promise<WorkspaceLink>
  /** Where a project's online workspace stands, without creating or waking it. */
  workspaceStatus?(projectId: string, workspace?: string): Promise<WorkspaceStatus>
  gitCredential?(projectId: string): Promise<{ username: string; password: string }>
}

export interface WorkspaceLink {
  url: string
  state: 'starting' | 'ready'
  token?: string
}

export type WorkspacePhase = 'machine' | 'studio' | 'sync' | 'project' | 'connect'

/** A workspace that is `off` has none yet, or is asleep; only opening it on purpose starts it. `failed` stopped while starting. */
export type WorkspaceStatus = (WorkspaceLink | { url: string; state: 'off' | 'failed'; token?: string }) & { phase?: WorkspacePhase; error?: string | null }

export type WorkspaceProgress = { state: 'off' | 'starting' | 'ready' | 'failed'; phase: WorkspacePhase | null; error: string | null }

export interface WorkspaceTarget {
  state: 'ready'
  url: string
  headers: Record<string, string>
  remoteKey: string
}

const WORKSPACE_TARGET_TTL = 30_000

/**
 * A project the account host holds that this computer does not: `online:<projectId>`, or `online:<projectId>@<workspace>`
 * for one of its online workspaces by slug. The ids are the account's own; core only reads the shape.
 */
export const ONLINE_KEY = 'online:'
export const isOnlineKey = (key: string) => key.startsWith(ONLINE_KEY)
export const onlineKeyParts = (key: string) => {
  const [projectId, workspace] = key.slice(ONLINE_KEY.length).split('@')
  return { projectId, workspace: workspace || undefined }
}
/** The account's id for an online key, or null for a project on this computer. */
export const onlineIdOf = (key: string) => (isOnlineKey(key) ? onlineKeyParts(key).projectId || null : null)

export interface AccountLink {
  apiUrl: string
  token: string
  baseBranch: string
  deployed: boolean
}

export interface RegistryEntry {
  id: string
  path: string
  addedAt: string
  slug?: string
  owner?: string
  name?: string
}

export const ownerSlug = (text: string | null | undefined) => {
  const slug = projectSlug(text ?? '')
  return RESERVED_SLUGS.has(slug) ? `${slug}-1` : slug
}

export const withSlugs = async (entries: RegistryEntry[], owner: string): Promise<RegistryEntry[]> => {
  const taken = new Set(entries.flatMap((e) => (e.slug ? [`${e.owner || owner}/${e.slug}`] : [])))
  for (const entry of entries) {
    entry.owner ||= owner
    if (entry.slug) continue
    entry.name = existsSync(entry.path) ? await projectName(entry.path) : basename(entry.path)
    const base = projectSlug(entry.name ?? '') || projectSlug(basename(entry.path)) || 'project'
    let slug = base
    for (let n = 2; taken.has(`${entry.owner}/${slug}`); n++) slug = `${base}-${n}`
    taken.add(`${entry.owner}/${slug}`)
    entry.slug = slug
  }
  return entries
}

export interface ProjectStore {
  load(): Promise<RegistryEntry[]>
  save(entries: RegistryEntry[]): Promise<void>
}

export const fileProjectStore = (home: string): ProjectStore => {
  const file = join(home, 'projects.json')
  return {
    async load() {
      if (!existsSync(file)) return []
      return JSON.parse(await readFile(file, 'utf8')).projects ?? []
    },
    async save(projects) {
      await mkdir(home, { recursive: true })
      await writeFile(file, JSON.stringify({ projects }, null, 2) + '\n')
    },
  }
}

// The team of the work that is only on this computer, and the only team the account host does not hold.
export const LOCAL_TEAM = 'local'

const DESIGN_ENV_KEYS = ['PATH', 'HOME', 'USER', 'LOGNAME', 'SHELL', 'TMPDIR', 'TMP', 'TEMP', 'LANG', 'LC_ALL', 'LC_CTYPE', 'TZ', 'TERM', 'NODE_ENV', 'NODE_OPTIONS', 'SystemRoot']

const designEnv = (): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const key of DESIGN_ENV_KEYS) {
    const value = process.env[key]
    if (value !== undefined) env[key] = value
  }
  for (const [key, value] of Object.entries(process.env)) {
    if (key.startsWith('PIKKU_DESIGN_') && value !== undefined && key !== 'PIKKU_DESIGN_SERVER_URL') env[key] = value
  }
  return env
}

export const studioHome = () =>
  process.env.PIKKU_STUDIO_HOME ?? join(homedir(), '.pikkustudio')

export const localAccount: AccountProvider = {
  async account() {
    return { signedIn: false, apiUrl: '', consoleUrl: '' }
  },
  async projects() {
    return []
  },
  async locate() {
    return null
  },
  async adopt() {},
  async startSignIn() {
    throw new Error('Signing in to an account is not part of this edition')
  },
  async pollSignIn() {
    throw new Error('Signing in to an account is not part of this edition')
  },
  async signOut() {},
  async modelAccess() {
    throw new Error('Account AI is not part of this edition')
  },
  async link() {
    return null
  },
}

const freePort = () =>
  new Promise<number>((resolvePort, reject) => {
    const server = createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, () => {
      const { port } = server.address() as { port: number }
      server.close(() => resolvePort(port))
    })
  })

const run = (command: string, args: string[], cwd: string) =>
  new Promise<void>((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, stdio: ['ignore', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr!.on('data', (d) => (stderr += d))
    child.on('error', reject)
    child.on('close', (code) =>
      code === 0
        ? resolveRun()
        : reject(new Error(`${command} ${args.join(' ')} failed: ${stderr.trim()}`))
    )
  })

const exited = (child: ChildProcess, timeoutMs: number) =>
  child.exitCode !== null || child.signalCode !== null
    ? Promise.resolve(true)
    : new Promise<boolean>((done) => {
        const timer = setTimeout(() => done(false), timeoutMs)
        child.once('exit', () => {
          clearTimeout(timer)
          done(true)
        })
      })

const signalTree = (child: ChildProcess, signal: NodeJS.Signals) => {
  try {
    if (child.pid) process.kill(-child.pid, signal)
    else child.kill(signal)
  } catch {
    child.kill(signal)
  }
}

const stopGracefully = async (child: ChildProcess | null, timeoutMs: number) => {
  if (!child) return
  signalTree(child, 'SIGINT')
  await exited(child, timeoutMs)
  signalTree(child, 'SIGKILL')
}

const ours = (pid: number) => {
  try {
    return /pikku|vite|esbuild|sandbox-exec|bwrap/.test(execFileSync('ps', ['-o', 'command=', '-p', String(pid)], { encoding: 'utf8' }))
  } catch {
    return false
  }
}

const tail = async (path: string, lines = 20) => {
  const text = existsSync(path) ? await readFile(path, 'utf8') : ''
  return text.trimEnd().split('\n').slice(-lines).join('\n')
}

const compiledAfter = (appDir: string) => {
  const out = join(appDir, 'src', 'paraglide')
  if (!existsSync(join(out, 'runtime.js'))) return false
  const newest = (dir: string): number =>
    !existsSync(dir)
      ? 0
      : readdirSync(dir, { withFileTypes: true }).reduce((latest, item) => {
          const path = join(dir, item.name)
          return Math.max(latest, item.isDirectory() ? newest(path) : statSync(path).mtimeMs)
        }, 0)
  const sources = Math.max(newest(join(appDir, 'messages')), newest(join(appDir, 'project.inlang')))
  return newest(out) >= sources
}

const messageApps = (root: string) => {
  const found: string[] = []
  const scan = (dir: string) => {
    if (existsSync(join(dir, 'project.inlang'))) found.push(dir)
  }
  scan(root)
  for (const group of ['apps', 'packages']) {
    const base = join(root, group)
    if (!existsSync(base)) continue
    for (const item of readdirSync(base, { withFileTypes: true })) if (item.isDirectory()) scan(join(base, item.name))
  }
  return found
}

const defaultParaglideCommand = (root: string) => (appDir: string) => {
  for (const dir of [appDir, root]) {
    const bin = join(dir, 'node_modules', '.bin', 'paraglide-js')
    if (existsSync(bin)) return { command: bin, args: ['compile', '--project', './project.inlang', '--outdir', './src/paraglide'] }
  }
  return null
}

const designUrl = (port: number) => `http://127.0.0.1:${port}/`

const waitForPort = async (port: number, timeoutMs = 180_000) => {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const up = await new Promise<boolean>((done) => {
      const socket = connect(port, '127.0.0.1')
      socket.once('connect', () => {
        socket.destroy()
        done(true)
      })
      socket.once('error', () => done(false))
    })
    if (up) return
    await new Promise((r) => setTimeout(r, 250))
  }
  throw new Error(`The project did not start on port ${port}`)
}

const entries = (dir: string) => {
  try {
    return readdirSync(dir)
  } catch {
    return []
  }
}

const repoOf = (path: string) => {
  for (let dir = path; dir !== dirname(dir); dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir
  }
  return path
}

export const linkedRepos = (root: string): string[] => {
  const packageDirs = [root, ...['packages', 'apps'].flatMap((d) => entries(join(root, d)).map((e) => join(root, d, e)))]
  const repos = new Set<string>()
  for (const dir of packageDirs) {
    const modules = join(dir, 'node_modules')
    for (const name of entries(modules)) {
      const names = name.startsWith('@') ? entries(join(modules, name)).map((n) => join(name, n)) : [name]
      for (const pkg of names) {
        const path = join(modules, pkg)
        try {
          if (!lstatSync(path).isSymbolicLink()) continue
          const target = realpathSync(path)
          if (!target.startsWith(root + sep)) repos.add(repoOf(target))
        } catch {}
      }
    }
  }
  return [...repos]
}

export const repoName = (address: string) => {
  const last = address.trim().replace(/\/+$/, '').replace(/\.git$/, '').split(/[/:]/).pop() ?? ''
  return last.replace(/[^\p{L}\p{N}._ -]/gu, '').trim() || 'Imported project'
}

export const cloneProblem = (error: unknown) => {
  const text = String((error as { stderr?: string })?.stderr ?? (error instanceof Error ? error.message : error))
  if (/permission denied|publickey|could not read (username|password)|authentication failed|host key verification|terminal prompts disabled|invalid username or (password|token)|\b40[13]\b/i.test(text))
    return 'Studio could not get in. It uses the git sign-in already set up on this computer, so check that your SSH key or your GitHub, Bitbucket or other git login works, then try again. A quick test: run git clone with this address in a terminal.'
  if (/not found|does not exist|could not resolve host|no such file|does not appear to be a git repository|unable to access|\b404\b/i.test(text))
    return 'Studio could not find a project at that address. Check the address, and that you have access to it.'
  return `Studio could not bring that in: ${text.trim().split('\n').find((l) => l.trim()) ?? 'something went wrong'}`
}

const defaultInstall = (dir: string) => {
  if (existsSync(join(dir, 'node_modules', '.bin'))) return null
  if (['bun.lock', 'bun.lockb', 'bunfig.toml'].some((file) => existsSync(join(dir, file)))) {
    return { command: 'bun', args: ['install'] }
  }
  if (existsSync(join(dir, 'pnpm-lock.yaml'))) return { command: 'pnpm', args: ['install'] }
  if (existsSync(join(dir, 'yarn.lock'))) return { command: 'yarn', args: ['install'] }
  return existsSync(join(dir, 'package.json')) ? { command: 'npm', args: ['install'] } : null
}

const slugify = (name: string) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'app'

async function remoteName(path: string): Promise<string | null> {
  try {
    const { stdout } = await promisify(execFile)('git', ['-C', path, 'config', '--get', 'remote.origin.url'])
    return stdout.trim().replace(/\/+$/, '').replace(/\.git$/, '').split(/[/:]/).pop() || null
  } catch {
    return null
  }
}

async function projectName(path: string): Promise<string> {
  const named = async (file: string) => {
    try {
      const name = JSON.parse(await readFile(file, 'utf8'))?.name
      return typeof name === 'string' && name.trim() ? name.trim() : null
    } catch {
      return null
    }
  }
  return (await named(join(path, '.studio', 'project.json'))) ?? (await remoteName(path)) ?? (await named(join(path, 'package.json'))) ?? basename(path)
}

export interface StudioProjectsOptions {
  currentRoot?: string | null
  // A sandbox serves one project (PIKKU_STUDIO_PROJECT): only currentRoot is listed or openable.
  pinned?: boolean
  account?: AccountProvider
  home?: string
  devCommand?: (port: number) => { command: string; args: string[] }
  installCommand?: (dir: string) => { command: string; args: string[] } | null
  serveCommand?: (port: number) => { command: string; args: string[] }
  stopTimeoutMs?: number
  designEntry?: string
  paraglideCommand?: (appDir: string) => { command: string; args: string[] } | null
  env?: (key: string, generated: Record<string, string>) => Promise<Record<string, string>>
  devContributors?: string[]
  personalSource?: (projectId: string) => ScopedSource | undefined
  teamSource?: (projectId: string, projectPath: string) => ScopedSource | undefined
  waitForPort?: (port: number) => Promise<void>
  startApps?: boolean
  appsManifest?: string
  createCommand?: (name: string) => { command: string; args: string[] }
  projectsDir?: string
  confine?: false | ((worktree: StudioWorktree) => Confinement)
  databaseCommands?: () => Array<{ command: string; args: string[] }>
  store?: ProjectStore
  owner?: () => Promise<string>
}

const outermostNodeModules = (path: string) => {
  const at = path.indexOf(`${sep}node_modules${sep}`)
  return at === -1 ? path : path.slice(0, at + `${sep}node_modules`.length)
}

const hoistedNodeModules = (packageDir: string) => {
  let dir = dirname(packageDir)
  for (;;) {
    const candidate = join(dir, 'node_modules')
    if (basename(dir) !== 'node_modules' && existsSync(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) return undefined
    dir = parent
  }
}

export const STUDIO_KEY = 'studio'

export class StudioProjectsService {
  private running = new Map<string, RunningProject & { child: ChildProcess }>()
  private apps = new Map<string, RunningApp[]>()
  private keeping = new Set<Promise<unknown>>()
  private lastUsed = new Map<string, number>()
  private account: AccountProvider
  private home: string

  private reaped: Promise<void> | undefined
  private starting = new Map<string, Promise<RunningProject>>()
  private served = new Map<string, { child: ChildProcess; port: number; worktree: string }>()

  constructor(private options: StudioProjectsOptions = {}) {
    this.account = options.account ?? localAccount
    this.home = options.home ?? studioHome()
    this.supervisor = new Supervisor({ pidFile: join(this.home, 'supervisor.pids.json') })
    process.once('exit', () => this.killAll())
  }

  private supervisor: Supervisor
  private designSpecs = new Map<string, ServiceSpec>()
  private designPrep = new Map<string, () => Promise<string | null>>()
  private designFailures = new Map<string, string>()

  private async compileMessages(root: string, confinement: Confinement | null): Promise<string | null> {
    const resolveCommand = this.options.paraglideCommand ?? defaultParaglideCommand(root)
    const failures: string[] = []
    for (const appDir of messageApps(root)) {
      if (compiledAfter(appDir)) continue
      const plan = resolveCommand(appDir)
      if (!plan) continue
      const output = await new Promise<string | null>((done) => {
        const options = { cwd: appDir, stdio: ['ignore', 'pipe', 'pipe'] as ['ignore', 'pipe', 'pipe'], env: process.env }
        let child: ChildProcess
        try {
          child = confinement ? confinedSpawn(plan.command, plan.args, confinement, options) : spawn(plan.command, plan.args, options)
        } catch (error) {
          return done(String(error))
        }
        let text = ''
        const timer = setTimeout(() => {
          text += '\nTimed out compiling messages'
          child.kill('SIGKILL')
        }, 120_000)
        child.stdout?.on('data', (d) => (text += d))
        child.stderr?.on('data', (d) => (text += d))
        child.on('error', (error) => {
          clearTimeout(timer)
          done(`${text}\n${error.message}`.trim())
        })
        child.on('close', (code) => {
          clearTimeout(timer)
          done(code === 0 ? null : `${basename(appDir)}: ${plan.command} ${plan.args.join(' ')} exited ${code}\n${text}`.trim())
        })
      })
      if (output) failures.push(output)
    }
    return failures.length ? failures.join('\n\n').split('\n').slice(-40).join('\n') : null
  }

  designStatus(key: string): ProjectDesign | null {
    const spec = this.designSpecs.get(key)
    if (!spec) return null
    const status = this.supervisor.status(key, 'design')
    const failure = this.designFailures.get(key)
    if (failure !== undefined) return { state: 'failed', url: designUrl(spec.port), restarts: 0, lastExit: null, logTail: failure }
    if (!status) return { state: 'starting', url: designUrl(spec.port), restarts: 0, lastExit: null, logTail: '' }
    return { state: status.state, url: designUrl(spec.port), restarts: status.restarts, lastExit: status.lastExit, logTail: status.logTail }
  }

  async restartDesign(key: string): Promise<ProjectDesign | null> {
    const spec = this.designSpecs.get(key)
    if (!spec) return null
    await this.supervisor.stop(key, 'design')
    const prep = this.designPrep.get(key)
    if (prep) {
      const failure = await prep()
      if (failure) this.designFailures.set(key, failure)
      else this.designFailures.delete(key)
      if (failure) return this.designStatus(key)
    }
    await this.supervisor.start(key, spec).catch(() => {})
    return this.designStatus(key)
  }

  private async startDesign(key: string, spec: ServiceSpec, prep?: () => Promise<string | null>) {
    this.designSpecs.set(key, spec)
    if (prep) {
      this.designPrep.set(key, prep)
      const failure = await prep().catch((error) => String(error))
      if (this.designSpecs.get(key) !== spec) return
      if (failure) {
        this.designFailures.set(key, failure)
        return
      }
      this.designFailures.delete(key)
    }
    await this.supervisor.start(key, spec).catch(() => {})
    if (this.designSpecs.get(key) !== spec) await this.supervisor.stopAll(key)
  }

  private stopDesign(key: string) {
    this.designSpecs.delete(key)
    this.designPrep.delete(key)
    this.designFailures.delete(key)
    return this.supervisor.stopAll(key)
  }

  private get pidDir() {
    return join(this.home, 'servers')
  }

  private pidFile(key: string) {
    return join(this.pidDir, `${key}.pid`)
  }

  private recordPid(key: string, child: ChildProcess) {
    if (!child.pid) return
    try {
      mkdirSync(this.pidDir, { recursive: true })
      writeFileSync(this.pidFile(key), String(child.pid))
    } catch {}
  }

  private forgetPid(key: string) {
    try {
      unlinkSync(this.pidFile(key))
    } catch {}
  }

  killAll() {
    for (const key of [...this.designSpecs.keys()]) {
      const pids = this.supervisor.list(key).map((status) => status.pid)
      void this.stopDesign(key)
      for (const pid of pids) {
        try {
          if (pid) process.kill(-pid, 'SIGKILL')
        } catch {}
      }
    }
    for (const [key, running] of this.running) {
      signalTree(running.child, 'SIGKILL')
      for (const app of this.apps.get(key) ?? []) if (app.child) signalTree(app.child, 'SIGKILL')
      this.forgetPid(key)
    }
    for (const [id, published] of this.served) {
      signalTree(published.child, 'SIGKILL')
      this.forgetPid(`${id}.published`)
    }
  }

  private reapStrays(): Promise<void> {
    return (this.reaped ??= (async () => {
      if (!existsSync(this.pidDir)) return
      for (const file of readdirSync(this.pidDir)) {
        const pid = Number(readFileSync(join(this.pidDir, file), 'utf8'))
        if (pid > 1 && ours(pid)) {
          try {
            process.kill(-pid, 'SIGKILL')
          } catch {}
        }
        try {
          unlinkSync(join(this.pidDir, file))
        } catch {}
      }
    })())
  }

  private async owner(): Promise<string> {
    const handle = (await this.account.account().catch(() => null))?.handle
    const named = ownerSlug(handle) || ownerSlug(await this.options.owner?.().catch(() => ''))
    return named || ownerSlug(userInfo().username) || 'me'
  }

  private get store() {
    return (this.options.store ??= fileProjectStore(this.home))
  }

  private async registry(): Promise<RegistryEntry[]> {
    const entries = await this.store.load()
    if (entries.some((e) => !e.slug || !e.owner)) await this.store.save(await withSlugs(entries, await this.owner()))
    return entries
  }

  private async saveRegistry(projects: RegistryEntry[]) {
    await this.store.save(projects)
  }

  get projectsDir() {
    return this.options.projectsDir ?? process.env.PIKKU_STUDIO_PROJECTS ?? join(this.home, 'local')
  }

  getAccount() {
    return this.account.account()
  }

  modelAccess() {
    return this.account.modelAccess()
  }

  accountLink(projectId: string) {
    return this.account.link(projectId)
  }

  startSignIn() {
    return this.account.startSignIn()
  }

  pollSignIn(code: string) {
    return this.account.pollSignIn(code)
  }

  signOut() {
    return this.account.signOut()
  }

  /**
   * Every project, or one team's: an account team's online projects (the copy on this computer standing in
   * for its online entry), or for the `local` team the projects that are only on this computer.
   */
  async list(team?: string): Promise<StudioProject[]> {
    const entries = await this.registry()
    const current = this.options.currentRoot ? resolve(this.options.currentRoot) : null
    if (current && !entries.some((e) => resolve(e.path) === current)) {
      entries.unshift({ id: 'current', path: current, addedAt: new Date().toISOString() })
    }
    if (this.options.pinned && current) {
      const pinned = entries.filter((e) => resolve(e.path) === current)
      entries.splice(0, entries.length, ...pinned)
    }
    const onlineTeam = team && team !== LOCAL_TEAM ? team : undefined
    const online = this.options.pinned ? [] : await this.account.projects(onlineTeam).catch(() => [] as OnlineProject[])
    const claimed = new Set<string>()
    const local = await Promise.all(
      entries.map(async (entry): Promise<StudioProject> => {
        const missing = !existsSync(entry.path)
        const found = missing ? null : await this.account.locate(entry.path, online).catch(() => null)
        const linkedId = found?.projectId ?? null
        const match = found?.project ?? null
        if (match) claimed.add(match.projectId)
        return {
          key: entry.id,
          owner: entry.owner ?? '',
          slug: entry.slug ?? entry.id,
          name: match?.name ?? entry.name ?? (missing ? basename(entry.path) : await projectName(entry.path)),
          location: match ? 'both' : 'local',
          path: entry.path,
          cloudProjectId: match?.projectId ?? linkedId,
          gitRepoUrl: match?.gitRepoUrl ?? null,
          current: resolve(entry.path) === current,
          missing,
          open: this.running.has(entry.id),
          worktrees: await this.worktreesOf(entry.path, missing),
        }
      })
    )
    const remote = online
      .filter((p) => !claimed.has(p.projectId))
      .map(
        (p): StudioProject => ({
          key: `${ONLINE_KEY}${p.projectId}`,
          owner: '',
          slug: '',
          name: p.name,
          location: 'online',
          path: null,
          cloudProjectId: p.projectId,
          gitRepoUrl: p.gitRepoUrl,
          current: false,
          missing: false,
          open: false,
          worktrees: [],
        })
      )
    const owner = await this.owner()
    const taken = new Set(local.map((p) => `${p.owner}/${p.slug}`))
    const here = team === undefined ? local : local.filter((p) => (onlineTeam ? p.location === 'both' : !p.cloudProjectId))
    return [
      ...here,
      ...(team === LOCAL_TEAM ? [] : remote).map((project) => {
        const base = projectSlug(project.name) || 'project'
        let slug = base
        for (let n = 2; taken.has(`${owner}/${slug}`); n++) slug = `${base}-${n}`
        taken.add(`${owner}/${slug}`)
        return { ...project, owner, slug }
      }),
    ]
  }

  async add(path: string, key?: string): Promise<StudioProject> {
    const absolute = resolve(path)
    if (!existsSync(absolute)) throw new Error(`No folder at ${absolute}`)
    const entries = await this.registry()
    let entry = entries.find((e) => resolve(e.path) === absolute)
    if (key && entries.some((e) => e.id === key && e !== entry)) throw new Error(`The key ${key} is already taken`)
    if (!entry) {
      entry = { id: key ?? randomUUID().slice(0, 8), path: absolute, addedAt: new Date().toISOString() }
      entries.push(entry)
      await this.saveRegistry(entries)
    } else if (key && entry.id !== key) {
      entry.id = key
      await this.saveRegistry(entries)
    }
    return (await this.list()).find((p) => p.key === entry!.id)!
  }

  async remove(key: string): Promise<void> {
    this.close(key)
    await this.saveRegistry((await this.registry()).filter((e) => e.id !== key))
  }

  async nameTaken(name: string): Promise<boolean> {
    const slug = projectSlug(name)
    return (await this.registry()).some((e) => e.slug === slug)
  }

  private async register(root: string, id: string, name: string): Promise<StudioProject> {
    const entries = await this.registry()
    const owner = await this.owner()
    const base = projectSlug(name) || 'project'
    let slug = base
    for (let n = 2; entries.some((e) => (e.owner || owner) === owner && e.slug === slug); n++) slug = `${base}-${n}`
    entries.push({ id, path: join(root, 'main'), addedAt: new Date().toISOString(), name, slug, owner })
    await this.saveRegistry(entries)
    return (await this.list()).find((p) => p.key === id)!
  }

  async create({ name, idea, surfaces, devices, path }: { name: string; idea?: string; surfaces?: string[]; devices?: string[]; path?: StartPath }): Promise<StudioProject> {
    if (await this.nameTaken(name)) throw new ConflictError(`You already have a project called ${name}`)
    const id = randomUUID().slice(0, 8)
    const root = join(this.projectsDir, id)
    const staging = join(root, '.scaffold')
    await mkdir(staging, { recursive: true })
    try {
      const starter = process.env.PIKKU_STARTER_TEMPLATE
      if (!this.options.createCommand && starter && existsSync(starter)) {
        await cp(starter, join(staging, slugify(name)), { recursive: true, filter: (path) => basename(path) !== 'node_modules' })
      } else {
        const { command, args } = (this.options.createCommand ??
          ((n) => ({ command: 'npx', args: ['-y', 'create-pikku@latest', '--template', 'starter-template', '--name', n, '--skip-install'] })))(slugify(name))
        await run(command, args, staging)
      }
      const scaffold = join(staging, slugify(name))
      await mkdir(join(scaffold, '.studio'), { recursive: true })
      await writeFile(
        join(scaffold, '.studio', 'project.json'),
        JSON.stringify({ name, idea: idea ?? null, ...(surfaces ? { surfaces } : {}), ...(devices ? { devices } : {}) }, null, 2) + '\n'
      )
      if (!existsSync(join(scaffold, '.git'))) await run('git', ['init', '-q', '-b', 'main'], scaffold)
      await commitPaths(scaffold, ['.'], 'Start with Pikku Studio')
      await createLayout(root, scaffold, this.home)
    } catch (error) {
      await rm(root, { recursive: true, force: true })
      throw error
    }
    await rm(staging, { recursive: true, force: true })
    await this.beginIntake(id, { idea, surfaces, devices, path })
    return this.register(root, id, name)
  }

  async beginIntake(key: string, { idea, surfaces, devices, path }: { idea?: string; surfaces?: string[]; devices?: string[]; path?: StartPath }): Promise<void> {
    await mkdir(dirname(this.intakeFile(key)), { recursive: true })
    await writeFile(this.intakeFile(key), JSON.stringify({ path: path ?? 'design', done: false, idea: idea ?? null, surfaces: surfaces ?? [], devices: devices ?? [], answers: [], skipped: path === 'interview' ? [] : ['questions'], run: null, jobs: {}, samples: false }) + '\n')
  }

  async clone(cloudProjectId: string): Promise<StudioProject> {
    const project = (await this.account.projects()).find((p) => p.projectId === cloudProjectId)
    if (!project) throw new Error('That project is not in your account')
    if (!project.gitRepoUrl) throw new Error(`${project.name} has no repository to clone`)
    if (await this.nameTaken(project.name)) throw new Error(`You already have a project called ${project.name}`)
    const id = randomUUID().slice(0, 8)
    const root = join(this.projectsDir, id)
    try {
      const credential = await this.account.gitCredential?.(project.projectId)
      await cloneLayout(root, project.gitRepoUrl, this.home, async (path) => {
        await this.account.adopt(project.projectId, path)
        await commitPaths(path, ['pikku.config.json'], 'Link to the account')
      }, credential, project.productionBranch)
    } catch (error) {
      await rm(root, { recursive: true, force: true })
      throw error
    }
    return this.register(root, id, project.name)
  }

  async importRepo(url: string, name?: string): Promise<StudioProject> {
    const address = url.trim()
    if (!address || address.startsWith('-')) throw new Error('Paste the address of the project you want to bring in')
    const called = name?.trim() || repoName(address)
    if (await this.nameTaken(called)) throw new ConflictError(`You already have a project called ${called}`)
    const id = randomUUID().slice(0, 8)
    const root = join(this.projectsDir, id)
    try {
      await cloneLayout(root, address, this.home)
    } catch (error) {
      await rm(root, { recursive: true, force: true })
      throw new Error(cloneProblem(error))
    }
    return this.register(root, id, called)
  }

  async linkRepo(key: string, url: string): Promise<{ pushed: boolean; remote: string; branches: string[] }> {
    const { id } = splitSessionKey(key)
    const entry = await this.entry(id)
    const root = layoutRoot(entry.path)
    if (!root) throw new Error('Only projects with a main version can be linked')
    const bare = join(root, 'repo.git')
    const existing = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: bare }).then((r) => r.stdout.trim(), () => '')
    if (existing && existing !== url) throw new Error(`This project is already connected to ${existing}`)
    if (!existing) {
      await execFileAsync('git', ['remote', 'add', 'origin', url], { cwd: bare })
      await execFileAsync('git', ['config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*'], { cwd: bare })
    }
    try {
      const sent = await this.pushAll(id)
      if (!sent.pushed) throw new Error('Nothing was sent')
      return sent
    } catch (error) {
      if (!existing) await execFileAsync('git', ['remote', 'remove', 'origin'], { cwd: bare }).catch(() => {})
      throw new Error(`Could not send ${entry.name} to ${url}: ${error instanceof Error ? error.message.split('\n').find((l) => l.trim()) : error}`)
    }
  }

  private pushes = new Map<string, Promise<unknown>>()

  pushAll(key: string): Promise<{ pushed: boolean; remote: string; branches: string[] }> {
    const { id } = splitSessionKey(key)
    const turn = (this.pushes.get(id) ?? Promise.resolve()).catch(() => {}).then(() => this.pushNow(id))
    this.pushes.set(id, turn)
    return turn
  }

  private async pushNow(id: string): Promise<{ pushed: boolean; remote: string; branches: string[] }> {
    const entry = await this.entry(id)
    const root = layoutRoot(entry.path)
    if (!root) return { pushed: false, remote: '', branches: [] }
    const bare = join(root, 'repo.git')
    const remote = await execFileAsync('git', ['remote', 'get-url', 'origin'], { cwd: bare }).then((r) => r.stdout.trim(), () => '')
    if (!remote) return { pushed: false, remote: '', branches: [] }
    await run('git', ['push', '-u', 'origin', '--all'], bare)
    return { pushed: true, remote, branches: [readFileSync(join(bare, 'HEAD'), 'utf8').trim().replace(/^ref: refs\/heads\//, ''), ...(await listWorktrees(root))] }
  }

  private intakeFile(key: string) {
    return join(this.projectsDir, splitSessionKey(key).id, 'intake.json')
  }

  async intake(key: string): Promise<Intake | null> {
    try {
      const raw = JSON.parse(await readFile(this.intakeFile(key), 'utf8')) as Partial<Intake> & { path: StartPath }
      return {
        path: raw.path,
        done: raw.done ?? false,
        idea: raw.idea ?? null,
        surfaces: raw.surfaces ?? [],
        devices: raw.devices ?? [],
        answers: raw.answers ?? [],
        skipped: raw.skipped ?? [],
        run: raw.run ?? null,
        jobs: raw.jobs ?? {},
        samples: raw.samples ?? false,
      }
    } catch {
      return null
    }
  }

  async updateIntake(key: string, change: (found: Intake) => Intake): Promise<Intake | null> {
    const found = (await this.intake(key)) ?? (existsSync(dirname(this.intakeFile(key))) ? EMPTY_INTAKE : null)
    if (!found) return null
    const next = change(found)
    await writeFile(this.intakeFile(key), JSON.stringify(next) + '\n')
    return next
  }

  async finishIntake(key: string): Promise<void> {
    await this.updateIntake(key, (found) => ({ ...found, done: true }))
  }

  async recordAnswer(key: string, question: string, answer: string, skipped = false): Promise<number> {
    const next = await this.updateIntake(key, (found) => {
      if (found.answers.length >= QUESTIONS) return found
      const answers = [...found.answers, { question, answer, skipped }]
      return { ...found, answers, done: answers.length >= QUESTIONS ? true : found.done }
    })
    return next?.answers.length ?? 0
  }

  async setSkipped(key: string, step: ChecklistStepId, skipped: boolean): Promise<void> {
    await this.updateIntake(key, (found) => ({ ...found, skipped: skipped ? [...new Set([...found.skipped, step])] : found.skipped.filter((s) => s !== step) }))
  }

  async noteRun(key: string, id: string): Promise<void> {
    await this.updateIntake(key, (found) => ({ ...found, run: { id, at: Date.now() } }))
  }

  async noteJob(key: string, job: 'frontend' | 'backend' | 'tests' | 'prep'): Promise<void> {
    await this.updateIntake(key, (found) => ({ ...found, jobs: { ...found.jobs, [job]: Date.now() } }))
  }

  async reopenQuestions(key: string): Promise<void> {
    await this.updateIntake(key, (found) => ({ ...found, path: 'interview', done: false, answers: [], skipped: found.skipped.filter((s) => s !== 'questions') }))
  }

  async setSamples(key: string, samples: boolean): Promise<void> {
    await this.updateIntake(key, (found) => ({ ...found, samples }))
  }

  private async entry(key: string): Promise<RegistryEntry> {
    const { id } = splitSessionKey(key)
    const entry = (await this.registry()).find((e) => e.id === id)
    if (!entry) throw new Error('Add the project to Studio before opening it')
    return entry
  }

  private runs = new Map<string, string>()

  private logFile(key: string, source: string, fresh = false) {
    if (fresh || !this.runs.has(key)) this.runs.set(key, Date.now().toString(36))
    const dir = join(this.home, 'logs', key)
    mkdirSync(dir, { recursive: true })
    return join(dir, `${this.runs.get(key)}.${source}.log`)
  }

  private latestRun(key: string): { dir: string; files: { run: string; source: string; file: string }[] } {
    const dir = join(this.home, 'logs', key)
    const files = (existsSync(dir) ? readdirSync(dir) : []).flatMap((file) => {
      const match = file.match(/^([0-9a-z]+)\.(.+)\.log$/)
      return match ? [{ run: match[1], source: match[2], file, at: statSync(join(dir, file)).mtimeMs }] : []
    })
    const newest = files.sort((a, b) => b.at - a.at)[0]?.run
    return { dir, files: files.filter((f) => f.run === newest) }
  }

  async disk(key: string) {
    return diskUsage((await this.entry(key)).path)
  }

  async runDirs(): Promise<{ key: string; dir: string }[]> {
    const registered = (await this.registry()).map((e) => ({ key: e.id, dir: join(e.path, '.pikku', 'runs') }))
    const live = [...this.running].map(([key, running]) => ({ key, dir: join(running.worktree, '.pikku', 'runs') }))
    return [...registered, ...live, { key: STUDIO_KEY, dir: join(process.cwd(), '.pikku', 'runs') }]
  }

  latestLog(key: string): string {
    const { dir, files } = this.latestRun(key)
    const server = files.find((f) => f.source === 'server')
    return server ? join(dir, server.file) : join(dir, `${this.runs.get(key) ?? 'next'}.server.log`)
  }

  async logs(key: string): Promise<{ sources: { id: string; lines: string[] }[] }> {
    await this.entry(key)
    const { dir, files } = this.latestRun(key)
    const sources = await Promise.all(
      files.map(async ({ source, file }) => ({
        id: source,
        lines: (await tail(join(dir, file), 400)).replace(/\x1b\[[0-9;]*m/g, '').split('\n').filter(Boolean),
      }))
    )
    return { sources: sources.sort((a, b) => Number(b.id === 'server') - Number(a.id === 'server')) }
  }

  private async keepTarget(key: string) {
    const entry = await this.entry(key)
    const { worktree: name } = splitSessionKey(key)
    const worktree = await ensureWorktree(entry.path, this.home, entry.id, name)
    const root = layoutRoot(entry.path)
    return { entry, worktree, repo: root && name !== 'develop' ? join(root, 'develop') : entry.path }
  }

  async themes(key: string): Promise<{ active: string; themes: ProjectTheme[] }> {
    const { repo } = await this.keepTarget(key)
    return listThemes(repo)
  }

  async versions(key: string): Promise<{ live: VersionCommit[]; ahead: VersionCommit[] }> {
    const { repo } = await this.keepTarget(key)
    return listVersions(repo)
  }

  async keepStatus(key: string): Promise<KeepStatus> {
    const { repo, worktree } = await this.keepTarget(key)
    return keepStatus(repo, worktree)
  }

  private async keep(key: string): Promise<{ result: KeepResult; id: string; develop: boolean }> {
    const { entry, repo, worktree } = await this.keepTarget(key)
    const keep = keepChanges(repo, worktree, await mainEnv(this.home))
    this.keeping.add(keep)
    const result = await keep.finally(() => this.keeping.delete(keep))
    return { result, id: entry.id, develop: worktree.branch === DEVELOP }
  }

  async keepChanges(key: string): Promise<KeepResult> {
    const { result, id, develop } = await this.keep(key)
    if (result.ok) {
      const push = this.pushAll(id).catch(() => null)
      this.keeping.add(push)
      void push.finally(() => this.keeping.delete(push))
    }
    if (result.ok && develop && this.served.has(id)) await this.publishLocal(id)
    return result
  }

  publishedProject(key: string): { port: number; url: string } | null {
    const published = this.served.get(splitSessionKey(key).id)
    return published ? { port: published.port, url: `http://127.0.0.1:${published.port}` } : null
  }

  async prepareMain(key: string): Promise<{ dir: string; kept: number } | null> {
    const { id } = splitSessionKey(key)
    const entry = await this.entry(id)
    if (!layoutRoot(entry.path)) return null
    const kept = (await this.keep(id).catch(() => null))?.result ?? { ok: true as const, kept: 0 }
    if (!kept.ok) throw new Error('There are changes that do not fit with the published version yet')
    const main = await ensureWorktree(entry.path, this.home, id, MAIN)
    const install = (this.options.installCommand ?? defaultInstall)(main.projectDir)
    if (install) await run(install.command, install.args, main.projectDir)
    await linkDevPikku(main.projectDir)
    if (existsSync(join(main.projectDir, 'db', 'sqlite'))) {
      for (const args of [['bootstrap'], ['db', 'codegen'], ['all'], ['db', 'migrate']]) await run('npx', ['pikku', ...args], main.projectDir)
    } else if (existsSync(join(main.projectDir, 'pikku.config.json'))) await run('npx', ['pikku', 'all'], main.projectDir)
    return { dir: main.projectDir, kept: kept.kept }
  }

  async publishLocal(key: string): Promise<{ port: number; url: string; kept: number }> {
    const { id } = splitSessionKey(key)
    const entry = await this.entry(id)
    const ready = await this.prepareMain(id)
    if (!ready) throw new Error('Only projects with a main version can be published')
    const main = { projectDir: ready.dir }
    const kept = { kept: ready.kept }
    await this.unpublishLocal(id)
    const port = await freePort()
    const logKey = `${id}.published`
    const log = openSync(this.logFile(logKey, 'server', true), 'a')
    const { command, args } = (this.options.serveCommand ?? ((p) => ({ command: 'npx', args: ['pikku', 'serve', '--port', String(p)] })))(port)
    const child = spawn(command, args, {
      cwd: main.projectDir,
      detached: true,
      stdio: ['ignore', log, log],
      env: { ...process.env, PORT: String(port), ...(await this.projectEnv(id, entry.path)) },
    })
    closeSync(log)
    this.recordPid(logKey, child)
    const published = { child, port, worktree: main.projectDir }
    this.served.set(id, published)
    child.once('exit', () => {
      if (this.served.get(id) === published) {
        this.served.delete(id)
        this.forgetPid(logKey)
      }
    })
    await (this.options.waitForPort ?? waitForPort)(port)
    return { port, url: `http://127.0.0.1:${port}`, kept: kept.kept }
  }

  async unpublishLocal(key: string): Promise<void> {
    const { id } = splitSessionKey(key)
    const published = this.served.get(id)
    if (!published) return
    this.served.delete(id)
    this.forgetPid(`${id}.published`)
    await stopGracefully(published.child, this.options.stopTimeoutMs ?? 10_000)
  }

  private async worktreesOf(path: string, missing: boolean): Promise<string[]> {
    const root = missing ? null : layoutRoot(path)
    return root ? listWorktrees(root).catch(() => []) : []
  }

  /** Commit and push the builder's work so a re-clone on wake does not lose it. */
  saveWork() {
    return saveWorktrees(this.home)
  }

  async worktrees(key: string): Promise<string[]> {
    const root = layoutRoot((await this.entry(key)).path)
    return root ? listWorktrees(root) : []
  }

  async createWorktree(key: string, name: string): Promise<string[]> {
    const root = layoutRoot((await this.entry(key)).path)
    if (!root) throw new Error('This project has no worktrees')
    await addWorktree(root, name)
    return listWorktrees(root)
  }

  async createSession(key: string, name = `s-${randomBytes(2).toString('hex')}`): Promise<string> {
    const entry = await this.entry(key)
    const root = layoutRoot(entry.path)
    if (!root) throw new Error('This project has no worktrees')
    await addWorktree(root, name)
    return sessionKey(entry.id, name)
  }

  async keys(): Promise<string[]> {
    const keys: string[] = []
    for (const entry of await this.registry()) {
      keys.push(entry.id)
      for (const name of await this.worktreesOf(entry.path, !existsSync(entry.path))) {
        if (name !== 'develop') keys.push(sessionKey(entry.id, name))
      }
    }
    return keys
  }

  openKeys(): string[] {
    return [...this.running.keys()]
  }

  async settle(): Promise<void> {
    await Promise.allSettled([...this.keeping])
  }

  async stop(key: string, timeoutMs = this.options.stopTimeoutMs ?? 10_000): Promise<void> {
    const running = this.running.get(key)
    const apps = this.apps.get(key) ?? []
    this.lastUsed.delete(key)
    this.running.delete(key)
    this.apps.delete(key)
    this.forgetPid(key)
    await Promise.all([
      this.stopDesign(key),
      ...[running?.child ?? null, ...apps.map((app) => app.child)].map((child) => stopGracefully(child, timeoutMs)),
    ])
  }

  async projectDir(key: string): Promise<string> {
    const entry = await this.entry(key)
    return (await ensureWorktree(entry.path, this.home, entry.id, splitSessionKey(key).worktree)).projectDir
  }

  async builderLaunch(key: string, mode: BuilderMode = 'build'): Promise<{ cwd: string; healDir: string; queueHome?: string; apiUrl?: string; apps: { slug: string; url: string }[]; env: Record<string, string>; launch?: Launcher }> {
    const entry = await this.entry(key)
    const worktree = await ensureWorktree(entry.path, this.home, entry.id, splitSessionKey(key).worktree)
    const port = this.running.get(key)?.port
    const healDir = join(this.home, 'heal')
    const linked = await new Promise<boolean>((done) =>
      execFile('git', ['remote'], { cwd: worktree.projectDir }, (error, out) => done(!error && out.trim().length > 0)),
    )
    const queueHome = linked ? undefined : join(this.home, 'queue-home')
    if (queueHome) await mkdir(queueHome, { recursive: true })
    const base = {
      cwd: worktree.projectDir,
      healDir,
      queueHome,
      apiUrl: port ? `http://localhost:${port}` : undefined,
      apps: this.projectApps(key).flatMap(({ slug, url, state }) => (state === 'ready' && url ? [{ slug, url }] : [])),
      env: await this.projectEnv(key, entry.path),
    }
    const confinement = this.confinement(worktree)
    if (!confinement) return base
    const scope = modeScope(mode, worktree.projectDir)
    const sandbox: Confinement = {
      ...confinement,
      only: scope.only,
      protected: [...(confinement.protected ?? []), ...(scope.protected ?? [])],
      listable: [...(confinement.listable ?? []), dirname(outermostNodeModules(piPackageRoot()))],
      writable: [...(confinement.writable ?? []), process.env.PI_CODING_AGENT_DIR ?? join(homedir(), '.pi', 'agent'), healDir],
      readable: [
        ...(confinement.readable ?? []),
        outermostNodeModules(piPackageRoot()),
        packageRoot,
        builderHome(),
        join(this.home, 'logs'),
        dirname(process.execPath),
      ],
    }
    return {
      ...base,
      launch: (command, args, options) =>
        confinedSpawn(command, args, sandbox, { ...options, stdio: ['pipe', 'pipe', 'pipe'] }),
    }
  }

  private async designCopy(key: string): Promise<string | undefined> {
    const entry = this.options.designEntry
    if (!entry) return undefined
    const source = dirname(entry)
    const copy = join(this.home, 'design', key)
    await rm(copy, { recursive: true, force: true })
    await cp(source, copy, {
      recursive: true,
      filter: (path) => path !== join(source, 'workspace'),
    })
    const modules = hoistedNodeModules(source)
    if (modules) {
      const link = join(dirname(copy), 'node_modules')
      await rm(link, { force: true })
      await symlink(modules, link, 'dir').catch(() => {})
    }
    return join(copy, basename(entry))
  }

  private confinement(worktree: StudioWorktree, design?: string): Confinement | null {
    if (this.options.confine === false || !canConfine()) return null
    if (this.options.confine) return this.options.confine(worktree)
    const base = worktreeConfinement(worktree)
    const readable = [join(homedir(), '.pikkustudio', 'auth.json')]
    if (this.options.designEntry) {
      readable.push(resolve(this.options.designEntry, '..', '..'))
      const modules = hoistedNodeModules(dirname(this.options.designEntry))
      if (modules) readable.push(modules)
    }
    readable.push(...linkedRepos(worktree.path))
    for (const contributor of this.options.devContributors ?? []) readable.push(contributor)
    const runtime = process.env.PIKKU_STUDIO_RUNTIME_DIR
    if (runtime) readable.push(runtime, dirname(process.execPath))
    const writable = design ? [dirname(design)] : []
    for (const dir of [process.env.UV_CACHE_DIR, process.env.UV_PYTHON_INSTALL_DIR, process.env.UV_TOOL_DIR, process.env.UV_TOOL_BIN_DIR]) {
      if (dir && existsSync(dir)) writable.push(dir)
    }
    return {
      ...base,
      readable: [...(base.readable ?? []), ...readable, ...writable],
      writable: [...(base.writable ?? []), ...writable],
    }
  }

  cascadeSources(key: string, projectPath: string): ScopedSource[] {
    const { id } = splitSessionKey(key)
    const personal = this.options.personalSource?.(id)
    const team = this.options.teamSource?.(id, projectPath)
    return [
      ...(personal ? [personal] : []),
      ...(team ? [team] : []),
      projectSource(projectPath),
      generatedSource(join(this.home, 'env', `${id}.env`)),
    ]
  }

  async projectEnv(key: string, projectPath: string, kind: 'dev' | 'ci' = 'dev'): Promise<Record<string, string>> {
    const { worktree } = splitSessionKey(key)
    const sources = this.cascadeSources(key, projectPath)
    const target = { kind, workspace: worktree }
    const known = await resolveEffective(sources, target)
    const missing = GENERATED_SECRETS.filter((name) => !known[name])
    if (missing.length > 0) {
      const generated = sources[sources.length - 1]!
      await setMany(generated, 'default', Object.fromEntries(missing.map((name) => [name, randomBytes(32).toString('base64')])))
    }
    return toEnv(await resolveEffective(sources, target))
  }

  async projectCascade(key: string, projectPath: string, kind: 'dev' | 'ci' = 'dev') {
    const { worktree } = splitSessionKey(key)
    const effective = await resolveEffective(this.cascadeSources(key, projectPath), { kind, workspace: worktree })
    return Object.entries(effective).map(([name, e]) => ({ name, scope: e.scope, source: e.source }))
  }

  async cascade(key: string, kind: 'dev' | 'ci' = 'dev') {
    return this.projectCascade(key, (await this.entry(key)).path, kind)
  }

  touch(key: string) {
    this.lastUsed.set(key, Date.now())
  }

  idleFor(key: string, now = Date.now()): number {
    return now - (this.lastUsed.get(key) ?? 0)
  }

  isKeeping(): boolean {
    return this.keeping.size > 0
  }

  runningProject(key: string): RunningProject | null {
    const running = this.running.get(key)
    return running ? { port: running.port, token: running.token, worktree: running.worktree } : null
  }

  private prepared = new Set<string>()
  private preparing = new Map<string, Promise<{ entry: RegistryEntry; worktree: StudioWorktree }>>()

  prepare(key: string) {
    const pending = this.preparing.get(key) ?? this.prepareOnce(key).finally(() => this.preparing.delete(key))
    this.preparing.set(key, pending)
    return pending
  }

  private async prepareOnce(key: string) {
    const entry = await this.entry(key)
    const worktree = await ensureWorktree(entry.path, this.home, entry.id, splitSessionKey(key).worktree)
    if (!this.prepared.has(key)) {
      const install = (this.options.installCommand ?? defaultInstall)(worktree.projectDir)
      if (install) await run(install.command, install.args, worktree.projectDir)
      await linkDevPikku(worktree.projectDir)
      if (existsSync(join(worktree.projectDir, 'db', 'sqlite'))) {
        for (const args of [['bootstrap'], ['db', 'codegen'], ['all'], ['db', 'migrate']]) {
          await run('npx', ['pikku', ...args], worktree.projectDir)
        }
      }
      this.prepared.add(key)
    }
    return { entry, worktree }
  }

  async workspaceLink(key: string): Promise<WorkspaceLink> {
    if (!isOnlineKey(key)) throw new Error('Only an online project has a workspace link')
    if (!this.account.workspaceLink) throw new Error('Online workspaces are not part of this edition')
    const { projectId, workspace } = onlineKeyParts(key)
    return this.account.workspaceLink(projectId, workspace)
  }

  /** Where an online project's workspace stands and how far its start has got, without starting it. */
  async workspaceStatus(key: string): Promise<WorkspaceProgress> {
    if (!isOnlineKey(key)) throw new Error('Only an online project has a workspace')
    if (!this.account.workspaceStatus) return { state: 'off', phase: null, error: null }
    const { projectId, workspace } = onlineKeyParts(key)
    const link = await this.account.workspaceStatus(projectId, workspace)
    if (link.state === 'off') return { state: 'off', phase: null, error: null }
    if (link.state === 'failed') return { state: 'failed', phase: link.phase ?? null, error: link.error ?? null }
    if (link.state === 'starting') return { state: 'starting', phase: link.phase ?? 'machine', error: null }
    const target = await this.workspaceTarget(key).catch(() => ({ state: 'starting' as const }))
    return target.state === 'ready' ? { state: 'ready', phase: null, error: null } : { state: 'starting', phase: 'connect', error: null }
  }

  private workspaceTargets = new Map<string, { at: number; target: WorkspaceTarget }>()

  /** Where to send an online project's requests. Passing a request through never starts a workspace; that is for opening it. */
  async workspaceTarget(key: string): Promise<WorkspaceTarget | { state: 'starting' | 'off' }> {
    const cached = this.workspaceTargets.get(key)
    if (cached && Date.now() - cached.at < WORKSPACE_TARGET_TTL) return cached.target
    const { projectId, workspace } = onlineKeyParts(key)
    const link = this.account.workspaceStatus ? await this.account.workspaceStatus(projectId, workspace) : await this.workspaceLink(key)
    if (link.state === 'off' || link.state === 'failed') return { state: 'off' }
    if (link.state !== 'ready' || !link.url) return { state: 'starting' }
    const headers: Record<string, string> = link.token ? { authorization: `Bearer ${link.token}` } : {}
    const res = await fetch(`${link.url}/studio/listProjects`, { method: 'POST', headers: { ...headers, 'content-type': 'application/json' }, body: '{}' })
    if (res.status === 503) return { state: 'starting' }
    if (!res.ok) throw new Error(`The workspace answered ${res.status}`)
    const remoteKey = ((await res.json()) as { projects?: { key: string }[] }).projects?.[0]?.key
    if (!remoteKey) throw new Error('The workspace has no project yet')
    const target: WorkspaceTarget = { state: 'ready', url: link.url, headers, remoteKey }
    this.workspaceTargets.set(key, { at: Date.now(), target })
    return target
  }

  async workspaceStudio<T>(key: string, name: string, data: Record<string, unknown>): Promise<T | null> {
    const target = await this.workspaceTarget(key)
    if (target.state !== 'ready') return null
    const res = await fetch(`${target.url}/studio/${name}`, { method: 'POST', headers: { ...target.headers, 'content-type': 'application/json' }, body: JSON.stringify({ ...data, key: target.remoteKey }) })
    if (!res.ok) throw new Error(`The workspace answered ${res.status}`)
    return (await res.json()) as T
  }

  async open(key: string): Promise<RunningProject> {
    if (this.options.pinned) {
      const only = (await this.list())[0]
      if (!only || only.key !== key) throw new Error('This workspace is for a single project')
    }
    const existing = this.runningProject(key)
    if (existing) {
      this.touch(key)
      return existing
    }
    let starting = this.starting.get(key)
    if (!starting) {
      starting = this.start(key).finally(() => this.starting.delete(key))
      this.starting.set(key, starting)
    }
    return starting
  }

  private async devConfigOverlay(projectDir: string): Promise<string | null> {
    const added = this.options.devContributors ?? []
    const configPath = join(projectDir, 'pikku.config.json')
    if (added.length === 0 || !existsSync(configPath)) return null
    let own: Array<{ module: string; export?: string }> = []
    try {
      own = JSON.parse(await readFile(configPath, 'utf8')).dev?.contributors ?? []
    } catch {
      return null
    }
    const contributors = [...own, ...added.filter((module) => !own.some((c) => c.module === module)).map((module) => ({ module }))]
    const dir = studioRuntimeDir(projectDir)
    const overlay = join(dir, 'pikku.config.json')
    await mkdir(dir, { recursive: true })
    await writeFile(overlay, JSON.stringify({ extends: relative(dir, configPath), dev: { contributors } }, null, 2))
    return overlay
  }

  private async start(key: string): Promise<RunningProject> {
    const { entry, worktree } = await this.prepare(key)
    const port = await freePort()
    const token = randomBytes(32).toString('hex')
    const pikkuBin = join(worktree.projectDir, 'node_modules', '.bin', 'pikku')
    const { command, args } = (this.options.devCommand ??
      ((p) =>
        existsSync(pikkuBin)
          ? { command: process.execPath, args: [pikkuBin, 'dev', '--port', String(p)] }
          : { command: 'npx', args: ['pikku', 'dev', '--port', String(p)] }))(port)
    await rm(join(worktree.projectDir, OLD_DEV_CONFIG), { force: true })
    const overlay = await this.devConfigOverlay(worktree.projectDir)
    if (overlay) args.push('--config', overlay)
    const design = await this.designCopy(key)
    const confinement = this.confinement(worktree, design)
    const logPath = this.logFile(key, 'server', true)
    const log = openSync(logPath, 'a')
    await this.reapStrays()
    const designPort = design ? await freePort() : 0
    const projectEnv = await this.projectEnv(key, entry.path)
    const generated = Object.fromEntries(GENERATED_SECRETS.filter((name) => projectEnv[name]).map((name) => [name, projectEnv[name]!]))
    const spawnOptions = {
      cwd: worktree.projectDir,
      detached: true,
      stdio: ['ignore', log, log] as ['ignore', number, number],
      env: {
        ...process.env,
        PORT: String(port),
        PIKKU_LOG_FORMAT: 'json',
        PIKKU_STUDIO_TOKEN: token,
        PIKKU_CONSOLE_TOKEN: token,
        ...(design ? { PIKKU_DESIGN_SERVER_URL: designUrl(designPort) } : {}),
        ...projectEnv,
        ...(await (this.options.env?.(key, generated) ?? {})),
      },
    }
    const child = confinement
      ? confinedSpawn(command, args, confinement, spawnOptions)
      : spawn(command, args, spawnOptions)
    closeSync(log)
    this.recordPid(key, child)
    const exited = new Promise<never>((_, reject) =>
      child.once('exit', async () =>
        reject(new Error(`The project stopped while starting:\n${await tail(logPath)}`))
      )
    )
    exited.catch(() => {})
    const running = { child, port, token, worktree: worktree.projectDir }
    this.running.set(key, running)
    this.touch(key)
    child.on('exit', () => {
      if (this.running.get(key) === running) {
        this.running.delete(key)
        this.forgetPid(key)
      }
    })
    if (design) {
      void this.startDesign(key, {
        name: 'design',
        command: process.execPath,
        args: [design, '--root', worktree.projectDir, '--port', String(designPort)],
        cwd: worktree.projectDir,
        env: designEnv(),
        port: designPort,
        logPath: join(this.home, 'logs', `${key}-design.log`),
        restart: 'on-crash',
        spawn: confinement ? (command, commandArgs, options) => confinedSpawn(command, commandArgs, confinement, options) : undefined,
      }, () => this.compileMessages(worktree.projectDir, confinement))
    }
    if (this.options.appsManifest) this.apps.set(key, manifestApps(this.options.appsManifest, worktree.projectDir))
    else if (this.options.startApps !== false) this.startApps(key, worktree.projectDir, port, confinement, spawnOptions.env)
    try {
      await Promise.race([(this.options.waitForPort ?? waitForPort)(port), exited])
    } catch (error) {
      this.close(key)
      const message = error instanceof Error ? error.message : String(error)
      if (message.startsWith('The project stopped')) throw error
      throw new Error(`${message}:\n${await tail(logPath)}`)
    }
    return { port, token, worktree: worktree.projectDir }
  }

  async updateDatabase(key: string): Promise<void> {
    const entry = await this.entry(key)
    this.close(key)
    const worktree = await ensureWorktree(entry.path, this.home, entry.id, splitSessionKey(key).worktree)
    const commands = this.options.databaseCommands?.() ?? [
      { command: 'npx', args: ['pikku', 'all'] },
      { command: 'npx', args: ['pikku', 'db', 'generate'] },
      { command: 'npx', args: ['pikku', 'db', 'migrate'] },
    ]
    for (const { command, args } of commands) await run(command, args, worktree.projectDir)
    if (existsSync(join(worktree.projectDir, 'db'))) {
      await commitPaths(worktree.projectDir, ['db'], 'Update the database')
    }
  }

  close(key: string) {
    this.lastUsed.delete(key)
    const running = this.running.get(key)
    if (running) signalTree(running.child, 'SIGTERM')
    this.running.delete(key)
    this.forgetPid(key)
    for (const app of this.apps.get(key) ?? []) if (app.child) signalTree(app.child, 'SIGTERM')
    this.apps.delete(key)
    void this.stopDesign(key)
  }

  projectApps(key: string): ProjectApp[] {
    return (this.apps.get(key) ?? []).map(({ slug, url, state, dir }) => {
      const look = latestShot(dir, slug)
      return { slug, url, state, shot: look?.shot ?? null, shotAt: look?.shotAt ?? null }
    })
  }

  async waitForApps(key: string, timeoutMs = 120_000): Promise<ProjectApp[]> {
    const until = Date.now() + timeoutMs
    for (;;) {
      const apps = this.projectApps(key)
      if (apps.some((app) => app.state === 'failed')) throw new Error('The app stopped while starting. Its log has the reason.')
      if (apps.every((app) => app.state === 'ready')) return apps
      if (Date.now() > until) throw new Error('The app is taking too long to start.')
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  }

  private startApps(key: string, projectDir: string, apiPort: number, confinement: Confinement | null, env: NodeJS.ProcessEnv) {
    const found = entries(join(projectDir, 'apps'))
      .filter((dir) => {
        const pkg = join(projectDir, 'apps', dir, 'package.json')
        if (!existsSync(pkg)) return false
        try {
          return /\bvite\b/.test(JSON.parse(readFileSync(pkg, 'utf8')).scripts?.dev ?? '')
        } catch {
          return false
        }
      })
      .map((dir) => ({ slug: dir, cwd: join(projectDir, 'apps', dir) }))
    const apps: RunningApp[] = found.map(({ slug }) => ({ slug, url: null, state: 'starting', child: null, dir: projectDir }))
    this.apps.set(key, apps)
    for (const app of apps) {
      void (async () => {
        const port = await freePort()
        const cwd = found.find((entry) => entry.slug === app.slug)!.cwd
        const logPath = this.logFile(key, app.slug)
        const log = openSync(logPath, 'a')
        const args = ['vite', 'dev', '--port', String(port), '--strictPort', '--host', '127.0.0.1']
        await rm(join(cwd, OLD_PREVIEW_CONFIG), { force: true })
        if (VITE_CONFIGS.some((name) => existsSync(join(cwd, name)))) {
          const config = join(studioRuntimeDir(projectDir), `${app.slug}.vite.config.mjs`)
          await mkdir(dirname(config), { recursive: true })
          await writeFile(config, previewViteConfig(cwd))
          args.push('--config', config)
        }
        const options = {
          cwd,
          detached: true,
          stdio: ['ignore', log, log] as ['ignore', number, number],
          env: { ...env, VITE_API_PROXY: `http://localhost:${apiPort}` },
        }
        const vite = [cwd, projectDir].map((dir) => join(dir, 'node_modules', '.bin', 'vite')).find((bin) => existsSync(bin))
        const [command, commandArgs] = vite ? [vite, args.slice(1)] : ['npx', args]
        const child = confinement
          ? confinedSpawn(command, commandArgs, confinement, options)
          : spawn(command, commandArgs, options)
        closeSync(log)
        app.child = child
        child.once('exit', () => {
          if (app.state !== 'ready') app.state = 'failed'
          app.child = null
        })
        try {
          await (this.options.waitForPort ?? waitForPort)(port)
          app.url = `http://127.0.0.1:${port}`
          app.state = 'ready'
        } catch {
          app.state = 'failed'
        }
      })()
    }
  }

  closeAll() {
    for (const key of this.running.keys()) this.close(key)
  }
}
