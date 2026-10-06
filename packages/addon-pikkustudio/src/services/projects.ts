import { execFile, execFileSync, spawn, type ChildProcess } from 'node:child_process'
import { promisify } from 'node:util'
import { closeSync, existsSync, lstatSync, mkdirSync, openSync, readFileSync, readdirSync, realpathSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { cp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { connect, createServer } from 'node:net'
import { homedir, userInfo } from 'node:os'
import { builderHome, packageRoot, piPackageRoot, type BuilderMode, type Launcher } from '@pikku/builder'
import { modeScope } from './builder-scope.js'
import { basename, dirname, join, resolve, sep } from 'node:path'
import { randomBytes, randomUUID } from 'node:crypto'
import { ConflictError } from '@pikku/core/errors'
import { generatedSource, projectSource, resolveEffective, setMany, toEnv, type ScopedSource } from '../lib/sources/index.js'
import { DEVELOP, MAIN, addWorktree, listWorktrees, layoutRoot, sessionKey, splitSessionKey, cloneLayout, commitPaths, createLayout, ensureWorktree, keepChanges, mainEnv, keepStatus, listVersions, listThemes, type ProjectTheme, type VersionCommit, worktreeConfinement, type KeepResult, type KeepStatus, type StudioWorktree } from './worktree.js'
import { canConfine, confinedSpawn, type Confinement } from './confine.js'
import { diskUsage } from './disk.js'
import { previewViteConfig } from './vite-preview.js'

const execFileAsync = promisify(execFile)

export type ProjectLocation = 'local' | 'cloud' | 'both'

const RESERVED_SLUGS = new Set(['projects', 'secrets', 'new-project', 'sign-in', 'your-name', 'choose-ai'])
const projectSlug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

export interface StudioProject {
  key: string
  owner: string
  slug: string
  name: string
  location: ProjectLocation
  path: string | null
  fabricProjectId: string | null
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
}

type RunningApp = ProjectApp & { child: ChildProcess | null }

const GENERATED_SECRETS = ['BETTER_AUTH_SECRET', 'SCENARIO_ACTOR_SECRET']

const VITE_CONFIGS = ['vite.config.ts', 'vite.config.mjs', 'vite.config.js']
const PREVIEW_CONFIG = '__pikku_studio.vite.config.mjs'

const excludeFromGit = async (cwd: string, name: string) => {
  const { stdout } = await execFileAsync('git', ['rev-parse', '--git-path', 'info/exclude'], { cwd })
  const path = resolve(cwd, stdout.trim())
  const current = existsSync(path) ? await readFile(path, 'utf8') : ''
  if (current.split('\n').includes(name)) return
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${current}${current && !current.endsWith('\n') ? '\n' : ''}${name}\n`)
}

export interface CloudProject {
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
  projects(): Promise<CloudProject[]>
  startSignIn(): Promise<{ code: string; url: string; expiresAt: string }>
  pollSignIn(code: string): Promise<SignInStatus>
  signOut(): Promise<void>
  modelAccess(): Promise<{ proxyUrl: string; apiKey: string }>
  link(projectId: string): Promise<AccountLink | null>
  locate(path: string, cloud: CloudProject[]): Promise<{ projectId: string; project: CloudProject | null } | null>
  adopt(projectId: string, path: string): Promise<void>
  workspaceLink?(projectId: string): Promise<WorkspaceLink>
  gitCredential?(projectId: string): Promise<{ username: string; password: string }>
}

export interface WorkspaceLink {
  url: string
  state: 'starting' | 'ready'
  token?: string
}

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
    const base = projectSlug(basename(entry.path)) || 'project'
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

async function projectName(path: string): Promise<string> {
  for (const file of [join(path, '.studio', 'project.json'), join(path, 'package.json')]) {
    try {
      const name = JSON.parse(await readFile(file, 'utf8'))?.name
      if (typeof name === 'string' && name.trim()) return name.trim()
    } catch {}
  }
  return basename(path)
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
  env?: (key: string) => Promise<Record<string, string>>
  personalSource?: (projectId: string) => ScopedSource | undefined
  teamSource?: (projectId: string) => ScopedSource | undefined
  waitForPort?: (port: number) => Promise<void>
  startApps?: boolean
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
    process.once('exit', () => this.killAll())
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

  async list(): Promise<StudioProject[]> {
    const entries = await this.registry()
    const current = this.options.currentRoot ? resolve(this.options.currentRoot) : null
    if (current && !entries.some((e) => resolve(e.path) === current)) {
      entries.unshift({ id: 'current', path: current, addedAt: new Date().toISOString() })
    }
    if (this.options.pinned && current) {
      const pinned = entries.filter((e) => resolve(e.path) === current)
      entries.splice(0, entries.length, ...pinned)
    }
    const cloud = this.options.pinned ? [] : await this.account.projects().catch(() => [] as CloudProject[])
    const claimed = new Set<string>()
    const local = await Promise.all(
      entries.map(async (entry): Promise<StudioProject> => {
        const missing = !existsSync(entry.path)
        const found = missing ? null : await this.account.locate(entry.path, cloud).catch(() => null)
        const linkedId = found?.projectId ?? null
        const match = found?.project ?? null
        if (match) claimed.add(match.projectId)
        return {
          key: entry.id,
          owner: entry.owner ?? '',
          slug: entry.slug ?? entry.id,
          name: match?.name ?? (missing ? basename(entry.path) : await projectName(entry.path)),
          location: match ? 'both' : 'local',
          path: entry.path,
          fabricProjectId: match?.projectId ?? linkedId,
          gitRepoUrl: match?.gitRepoUrl ?? null,
          current: resolve(entry.path) === current,
          missing,
          open: this.running.has(entry.id),
          worktrees: await this.worktreesOf(entry.path, missing),
        }
      })
    )
    const remote = cloud
      .filter((p) => !claimed.has(p.projectId))
      .map(
        (p): StudioProject => ({
          key: `cloud:${p.projectId}`,
          owner: '',
          slug: '',
          name: p.name,
          location: 'cloud',
          path: null,
          fabricProjectId: p.projectId,
          gitRepoUrl: p.gitRepoUrl,
          current: false,
          missing: false,
          open: false,
          worktrees: [],
        })
      )
    const owner = await this.owner()
    const taken = new Set(local.map((p) => `${p.owner}/${p.slug}`))
    return [
      ...local,
      ...remote.map((project) => {
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

  async create({ name, idea, surfaces, devices }: { name: string; idea?: string; surfaces?: string[]; devices?: string[] }): Promise<StudioProject> {
    if (await this.nameTaken(name)) throw new ConflictError(`You already have a project called ${name}`)
    const id = randomUUID().slice(0, 8)
    const root = join(this.projectsDir, id)
    const staging = join(root, '.scaffold')
    await mkdir(staging, { recursive: true })
    try {
      const { command, args } = (this.options.createCommand ??
        ((n) => {
          const starter = process.env.PIKKU_STARTER_TEMPLATE
          if (starter && existsSync(starter)) return { command: 'cp', args: ['-R', starter, join(staging, n)] }
          return { command: 'npx', args: ['-y', 'create-pikku@latest', '--template', 'fabric', '--name', n, '--skip-install'] }
        }))(slugify(name))
      await run(command, args, staging)
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
    return this.register(root, id, name)
  }

  async clone(fabricProjectId: string): Promise<StudioProject> {
    const project = (await this.account.projects()).find((p) => p.projectId === fabricProjectId)
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
      }, credential)
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
    return { pushed: true, remote, branches: [MAIN, ...(await listWorktrees(root))] }
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
    await Promise.all([running?.child ?? null, ...apps.map((app) => app.child)].map((child) => stopGracefully(child, timeoutMs)))
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
    const modules = join(source, '..', 'node_modules')
    if (existsSync(modules)) await symlink(modules, join(copy, 'node_modules'), 'dir')
    return join(copy, basename(entry))
  }

  private confinement(worktree: StudioWorktree, design?: string): Confinement | null {
    if (this.options.confine === false || !canConfine()) return null
    if (this.options.confine) return this.options.confine(worktree)
    const base = worktreeConfinement(worktree)
    const readable = [join(homedir(), '.fabric', 'auth.json')]
    if (this.options.designEntry) readable.push(resolve(this.options.designEntry, '..', '..'))
    readable.push(...linkedRepos(worktree.path))
    const writable = design ? [dirname(design)] : []
    return {
      ...base,
      readable: [...(base.readable ?? []), ...readable, ...writable],
      writable: [...(base.writable ?? []), ...writable],
    }
  }

  cascadeSources(key: string, projectPath: string): ScopedSource[] {
    const { id } = splitSessionKey(key)
    const personal = this.options.personalSource?.(id)
    const team = this.options.teamSource?.(id)
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

  async prepare(key: string) {
    const entry = await this.entry(key)
    const worktree = await ensureWorktree(entry.path, this.home, entry.id, splitSessionKey(key).worktree)
    if (!this.prepared.has(key)) {
      const install = (this.options.installCommand ?? defaultInstall)(worktree.projectDir)
      if (install) await run(install.command, install.args, worktree.projectDir)
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
    if (!key.startsWith('cloud:')) throw new Error('Only a cloud project has a workspace link')
    if (!this.account.workspaceLink) throw new Error('Cloud workspaces are not part of this edition')
    return this.account.workspaceLink(key.slice('cloud:'.length))
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

  private async start(key: string): Promise<RunningProject> {
    const { entry, worktree } = await this.prepare(key)
    const port = await freePort()
    const token = randomBytes(32).toString('hex')
    const { command, args } = (this.options.devCommand ??
      ((p) => ({ command: 'npx', args: ['pikku', 'dev', '--port', String(p)] })))(port)
    const design = await this.designCopy(key)
    const confinement = this.confinement(worktree, design)
    const logPath = this.logFile(key, 'server', true)
    const log = openSync(logPath, 'a')
    await this.reapStrays()
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
        ...(design ? { PIKKU_STUDIO_DESIGN: design } : {}),
        ...(await this.projectEnv(key, entry.path)),
        ...(await (this.options.env?.(key) ?? {})),
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
    try {
      await Promise.race([(this.options.waitForPort ?? waitForPort)(port), exited])
    } catch (error) {
      this.close(key)
      const message = error instanceof Error ? error.message : String(error)
      if (message.startsWith('The project stopped')) throw error
      throw new Error(`${message}:\n${await tail(logPath)}`)
    }
    if (this.options.startApps !== false) this.startApps(key, worktree.projectDir, port, confinement, spawnOptions.env)
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
  }

  projectApps(key: string): ProjectApp[] {
    return (this.apps.get(key) ?? []).map(({ slug, url, state }) => ({ slug, url, state }))
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
    const found = ['apps', 'prototypes'].flatMap((group) =>
      entries(join(projectDir, group))
        .filter((dir) => {
          const pkg = join(projectDir, group, dir, 'package.json')
          if (!existsSync(pkg)) return false
          try {
            return /\bvite\b/.test(JSON.parse(readFileSync(pkg, 'utf8')).scripts?.dev ?? '')
          } catch {
            return false
          }
        })
        .map((dir) => ({ slug: group === 'apps' ? dir : `prototype-${dir}`, cwd: join(projectDir, group, dir) }))
    )
    const apps: RunningApp[] = found.map(({ slug }) => ({ slug, url: null, state: 'starting', child: null }))
    this.apps.set(key, apps)
    for (const app of apps) {
      void (async () => {
        const port = await freePort()
        const cwd = found.find((entry) => entry.slug === app.slug)!.cwd
        const logPath = this.logFile(key, app.slug)
        const log = openSync(logPath, 'a')
        const args = ['vite', 'dev', '--port', String(port), '--strictPort', '--host', '127.0.0.1']
        if (VITE_CONFIGS.some((name) => existsSync(join(cwd, name)))) {
          await writeFile(join(cwd, PREVIEW_CONFIG), previewViteConfig(cwd))
          await excludeFromGit(cwd, PREVIEW_CONFIG)
          args.push('--config', PREVIEW_CONFIG)
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
