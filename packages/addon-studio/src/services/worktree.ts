import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { chmod, copyFile, cp, mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import type { Confinement } from './confine.js'
import { trackLargeFiles } from './lfs.js'
import { runBounded, firstLines, type BoundedResult } from './bounded-run.js'
import { resolveWt, worktrunkConfigFile } from './worktree-sweep.js'

const exec = promisify(execFile)

const git = async (cwd: string, ...args: string[]) =>
  (await exec('git', args, { cwd })).stdout.trim()

const IDENTITY = ['-c', 'user.name=Studio', '-c', 'user.email=studio@pikku.dev', '-c', 'gc.auto=0', '-c', 'maintenance.auto=false']

export interface StudioWorktree {
  path: string
  branch: string
  gitDir: string
  projectDir: string
}

const inRepo = (path: string) =>
  git(path, 'rev-parse', '--show-toplevel').then(() => true, () => false)

export async function ensureRepo(path: string): Promise<void> {
  if (!(await inRepo(path))) await git(path, 'init', '-q', '-b', 'main')
  if (await git(path, 'rev-parse', '--verify', '-q', 'HEAD').then(() => true, () => false)) return
  await trackLargeFiles(path).catch(() => [])
  await git(path, 'add', '-A')
  await git(path, ...IDENTITY, 'commit', '-q', '--allow-empty', '-m', 'Start')
}

export async function commitPaths(repo: string, paths: string[], message: string): Promise<void> {
  await ensureRepo(repo)
  await trackLargeFiles(repo).catch(() => [])
  await git(repo, 'add', '--', ...paths)
  const staged = await git(repo, 'diff', '--cached', '--quiet', '--', ...paths).then(() => false, () => true)
  if (staged) await git(repo, ...IDENTITY, 'commit', '-q', '-m', message, '--', ...paths)
}

export const MAIN = 'main'
export const DEVELOP = 'develop'

const liveBranch = (bare: string): string => readFileSync(join(bare, 'HEAD'), 'utf8').trim().replace(/^ref: refs\/heads\//, '')

const workBranch = (live: string): string => (live.startsWith('main-') ? `staging-${live.slice('main-'.length)}` : DEVELOP)

export const layoutRoot = (path: string): string | null =>
  basename(path) === MAIN && existsSync(join(dirname(path), 'repo.git')) ? dirname(path) : null

async function addLayoutWorktrees(root: string, base: string, onMain?: (main: string) => Promise<void>): Promise<void> {
  const bare = join(root, 'repo.git')
  await git(bare, 'worktree', 'add', '-q', join(root, MAIN), base)
  await onMain?.(join(root, MAIN))
  const work = workBranch(base)
  const has = await git(bare, 'rev-parse', '--verify', '-q', `refs/heads/${work}`).then(() => true, () => false)
  if (has) await git(bare, 'worktree', 'add', '-q', join(root, DEVELOP), work)
  else await git(bare, 'worktree', 'add', '-q', '-b', work, join(root, DEVELOP), base)
}

export async function createLayout(root: string, scaffold: string, studioHome: string): Promise<void> {
  await ensureRepo(scaffold)
  await git(scaffold, 'branch', '-M', MAIN)
  await mkdir(root, { recursive: true })
  await git(root, 'clone', '-q', '--bare', scaffold, join(root, 'repo.git'))
  await git(join(root, 'repo.git'), 'remote', 'remove', 'origin')
  await addLayoutWorktrees(root, MAIN)
  await guardMain(root, studioHome)
  await rm(scaffold, { recursive: true, force: true })
}

export interface GitCredential {
  username: string
  password: string
}

const credentialEnv = (credential?: GitCredential): Record<string, string> =>
  credential
    ? {
        GIT_CONFIG_COUNT: '1',
        GIT_CONFIG_KEY_0: 'http.extraHeader',
        GIT_CONFIG_VALUE_0: `Authorization: Basic ${Buffer.from(`${credential.username}:${credential.password}`).toString('base64')}`
      }
    : {}

export async function cloneLayout(
  root: string,
  url: string,
  studioHome: string,
  onMain?: (main: string) => Promise<void>,
  credential?: GitCredential,
  live?: string
): Promise<void> {
  await mkdir(root, { recursive: true })
  await exec('git', ['clone', '-q', '--bare', '--', url, join(root, 'repo.git')], {
    cwd: root,
    env: { ...process.env, ...credentialEnv(credential), GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? 'ssh -o BatchMode=yes -o ConnectTimeout=15' },
  })
  const bare = join(root, 'repo.git')
  await git(bare, 'config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*')
  const base = live || (await git(bare, 'symbolic-ref', '--short', 'HEAD'))
  await git(bare, 'symbolic-ref', 'HEAD', `refs/heads/${base}`)
  await addLayoutWorktrees(root, base, onMain)
  await guardMain(root, studioHome)
}

export const sessionKey = (id: string, worktree: string) => (worktree === DEVELOP ? id : `${id}.${worktree}`)

export const splitSessionKey = (key: string): { id: string; worktree: string } => {
  const dot = key.indexOf('.')
  return dot < 0 ? { id: key, worktree: DEVELOP } : { id: key.slice(0, dot), worktree: key.slice(dot + 1) }
}

const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/

const seedTimeoutMs = () => Number(process.env.PIKKU_STUDIO_SEED_TIMEOUT_MS) || 120_000

/** worktrunk 0.81 refuses to run on older git. */
const MIN_GIT: [number, number] = [2, 43]

let gitVersion: Promise<string | null> | undefined

const readGitVersion = () => {
  gitVersion ??= exec('git', ['--version']).then((r) => r.stdout.trim().replace(/^git version\s+/, ''), () => null)
  return gitVersion
}

/** True unless git is known to be older than worktrunk needs. An unreadable version does not block. */
export async function gitSupportsWorktrunk(): Promise<{ ok: boolean; version: string | null }> {
  const version = await readGitVersion()
  const match = version?.match(/^(\d+)\.(\d+)/)
  if (!match) return { ok: true, version }
  const [major, minor] = [Number(match[1]), Number(match[2])]
  return { ok: major > MIN_GIT[0] || (major === MIN_GIT[0] && minor >= MIN_GIT[1]), version }
}

const reflinkByVolume = new Map<number, Promise<boolean>>()

/** Forgets what was learned about git and the volumes. For tests. */
export function resetSeedCaches(): void {
  gitVersion = undefined
  reflinkByVolume.clear()
}

/**
 * Whether the volume holding `dir` clones files copy-on-write: a probe copy of a small file with
 * `cp --reflink=always` (`cp -c` on macOS). Asked once per volume. A probe that cannot run says no, which is
 * the safe answer (the install fallback is used instead of a full copy).
 */
export async function canReflink(dir: string): Promise<boolean> {
  try {
    const volume = (await stat(dir)).dev
    let known = reflinkByVolume.get(volume)
    if (!known) {
      known = probeReflink(dir)
      reflinkByVolume.set(volume, known)
    }
    return await known
  } catch {
    return false
  }
}

async function probeReflink(dir: string): Promise<boolean> {
  const from = join(dir, `.reflink-probe-${randomBytes(4).toString('hex')}`)
  const to = `${from}.copy`
  try {
    await writeFile(from, randomBytes(64 * 1024))
    const flags = process.platform === 'darwin' ? ['-c'] : ['--reflink=always']
    return (await runBounded('cp', [...flags, from, to], { timeoutMs: 10_000 })).code === 0
  } catch {
    return false
  } finally {
    await rm(from, { force: true }).catch(() => undefined)
    await rm(to, { force: true }).catch(() => undefined)
  }
}

/** Package managers whose install links from a shared store instead of copying. */
const LOCKFILES = [
  { files: ['bun.lock', 'bun.lockb'], command: 'bun', args: ['install', '--frozen-lockfile'] },
  { files: ['pnpm-lock.yaml'], command: 'pnpm', args: ['install', '--frozen-lockfile'] },
]

const lockfileOf = (dir: string) => {
  for (const manager of LOCKFILES) {
    const file = manager.files.find((f) => existsSync(join(dir, f)))
    if (file) return { ...manager, file }
  }
  return null
}

// Hard links make the new worktree's packages share disk with the package manager's cache.
const installArgs = (manager: { command: string; args: string[] }, linked: boolean) =>
  linked && manager.command === 'bun' ? [...manager.args, '--backend=hardlink'] : manager.args

const safeEntry = (entry: string) => !isAbsolute(entry) && !entry.split('/').includes('..')

const isDeps = (entry: string) => entry.split('/').includes('node_modules')

const sameFile = async (a: string, b: string) => {
  try {
    return (await readFile(a)).equals(await readFile(b))
  } catch {
    return true
  }
}

const describeFailure = (what: string, result: BoundedResult) =>
  result.error
    ? `${what} could not start: ${result.error}`
    : result.timedOut
      ? `${what} timed out and was stopped`
      : `${what} exited ${result.code}${firstLines(result.stderr) ? `: ${firstLines(result.stderr)}` : ''}`

/**
 * Fills a new session worktree with the ignored files `develop` lists in its tracked `.worktreeinclude`
 * (installed deps, build output), via worktrunk. Never throws: without `wt`, on git older than worktrunk
 * needs, or when it fails or times out, the plain worktree stays. A project without `.worktreeinclude`
 * copies nothing and installs nothing. Uses the same empty worktrunk config as the sweep, so the person's own hooks and settings never run.
 *
 * Where the volume can clone copy-on-write (APFS, btrfs, xfs) everything is cloned, and the dependencies are
 * reinstalled only when the lockfile differs from develop's. Where it cannot (ext4), a full copy of
 * node_modules would cost hundreds of MB, so build output is copied and the dependencies come from a frozen
 * install, which hard-links from the package manager's cache. Every command runs in its own process group,
 * killed whole on timeout.
 */
export async function seedWorktree(root: string, name: string, home: string): Promise<void> {
  const wt = resolveWt(process.env.PIKKU_STUDIO_WT || undefined)
  if (!wt) return console.warn(`[studio] wt not available: "${name}" starts without installed dependencies`)
  const path = join(root, name)
  const develop = join(root, DEVELOP)
  const timeoutMs = seedTimeoutMs()
  try {
    const gitCheck = await gitSupportsWorktrunk()
    if (!gitCheck.ok) {
      return console.warn(`[studio] worktrunk needs git ${MIN_GIT.join('.')}+ (found ${gitCheck.version}): "${name}" starts without installed dependencies`)
    }
    await mkdir(home, { recursive: true })
    const config = worktrunkConfigFile(home)
    await writeFile(config, '')
    const base = ['-C', path, '--config', config, 'step', 'copy-ignored', '--from', DEVELOP, '--require-include', '-y']
    const reflink = await canReflink(root)
    let install = false
    if (reflink) {
      const copied = await runBounded(wt, base, { timeoutMs })
      if (copied.code !== 0) return console.warn(`[studio] could not seed worktree "${name}": ${describeFailure('wt', copied)}`)
      const lock = lockfileOf(develop)
      install = !!lock && !(await sameFile(join(develop, lock.file), join(path, lock.file)))
    } else {
      const planned = await runBounded(wt, [...base, '--dry-run', '--format', 'json'], { timeoutMs })
      if (planned.code !== 0) return console.warn(`[studio] could not seed worktree "${name}": ${describeFailure('wt', planned)}`)
      const entries = ((JSON.parse(planned.stdout) as { entries?: { path: string }[] }).entries ?? []).map((e) => e.path).filter(safeEntry)
      for (const entry of entries.filter((e) => !isDeps(e))) {
        await cp(join(develop, entry), join(path, entry), { recursive: true, force: false, errorOnExist: false, verbatimSymlinks: true })
      }
      install = entries.some(isDeps)
    }
    const manager = install ? lockfileOf(path) : null
    if (manager) {
      const result = await runBounded(manager.command, installArgs(manager, !reflink), { cwd: path, timeoutMs: timeoutMs * 2 })
      if (result.code !== 0) console.warn(`[studio] could not install dependencies in worktree "${name}": ${describeFailure(manager.command, result)}`)
    }
  } catch (error) {
    console.warn(`[studio] could not seed worktree "${name}": ${firstLines((error as Error).message, 1)}`)
  }
}

export async function addWorktree(root: string, name: string, seedHome?: string): Promise<void> {
  if (!NAME.test(name) || name === MAIN || name === DEVELOP) throw new Error(`"${name}" cannot be used as a worktree name`)
  if (existsSync(join(root, name))) throw new Error(`A worktree called "${name}" already exists`)
  await git(join(root, DEVELOP), 'worktree', 'add', '-q', '-b', name, join(root, name))
  if (seedHome) await seedWorktree(root, name, seedHome)
}

export async function listWorktrees(root: string): Promise<string[]> {
  const bare = join(root, 'repo.git')
  const out = await git(bare, 'worktree', 'list', '--porcelain')
  return lines(out)
    .filter((l) => l.startsWith('branch '))
    .map((l) => l.slice('branch refs/heads/'.length))
    .filter((b) => b !== liveBranch(bare))
}

export async function ensureWorktree(
  repo: string,
  studioHome: string,
  id: string,
  name: string = DEVELOP
): Promise<StudioWorktree> {
  const root = layoutRoot(repo)
  if (root) {
    if (name !== DEVELOP && !existsSync(join(root, name))) throw new Error(`No worktree called "${name}"`)
    const path = join(root, name)
    const prefix = await git(repo, 'rev-parse', '--show-prefix')
    return { path, branch: name, gitDir: join(root, 'repo.git'), projectDir: prefix ? join(path, prefix.replace(/\/$/, '')) : path }
  }
  await ensureRepo(repo)
  await restoreChanges(repo, studioHome)
  const prefix = await git(repo, 'rev-parse', '--show-prefix')
  const path = join(studioHome, 'worktrees', id)
  // A checkout that is already the person's own isolated workspace (a cloud workspace on its own
  // branch) is worked in directly, so the branch they picked is the one they see the builder's work on.
  // A builder worktree made before this keeps being used, so the work on it is not hidden.
  if (process.env.PIKKU_STUDIO_IN_PLACE === '1' && !existsSync(path)) {
    const top = await git(repo, 'rev-parse', '--show-toplevel')
    const common = await git(top, 'rev-parse', '--git-common-dir')
    return {
      path: top,
      branch: (await tryGit(top, 'symbolic-ref', '--short', '-q', 'HEAD')).output || 'HEAD',
      gitDir: isAbsolute(common) ? common : resolve(top, common),
      projectDir: prefix ? join(top, prefix.replace(/\/$/, '')) : top,
    }
  }
  const branch = `studio/${id}`
  // The studio home outlives the checkout: a sandbox that wakes re-clones the repo, and the worktree
  // folder left behind then names a git directory that is gone. Set the folder aside (it may hold
  // work) and make a fresh worktree instead of failing every build on it.
  if (existsSync(path) && !(await git(path, 'rev-parse', '--git-common-dir').then(() => true, () => false))) {
    await rename(path, `${path}.stale-${Date.now()}`)
    await git(repo, 'worktree', 'prune')
  }
  if (!existsSync(path)) {
    await mkdir(join(studioHome, 'worktrees'), { recursive: true })
    // After a wake re-cloned the repo, what the builder had pushed is on the remote: carry on from it.
    // The sandbox's clone follows only its own branch, so ask for the builder's explicitly.
    await tryGit(repo, 'fetch', '-q', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`)
    const pushed = await tryGit(repo, 'rev-parse', '--verify', '-q', `refs/remotes/origin/${branch}`)
    await git(repo, 'worktree', 'add', '-q', '-B', branch, path, pushed.ok ? `origin/${branch}` : 'HEAD')
  }
  const common = await git(path, 'rev-parse', '--git-common-dir')
  return {
    path,
    branch,
    gitDir: isAbsolute(common) ? common : resolve(path, common),
    projectDir: prefix ? join(path, prefix.replace(/\/$/, '')) : path,
  }
}

export const mainTokenFile = (studioHome: string) => join(studioHome, 'main-token')

export async function mainToken(studioHome: string): Promise<string> {
  const file = mainTokenFile(studioHome)
  if (existsSync(file)) return (await readFile(file, 'utf8')).trim()
  const token = randomBytes(32).toString('hex')
  await mkdir(studioHome, { recursive: true })
  await writeFile(file, token + '\n', { mode: 0o600 })
  return token
}

export const mainEnv = async (studioHome: string) => ({ PIKKU_STUDIO_MAIN: await mainToken(studioHome) })

export async function guardMain(root: string, studioHome: string): Promise<void> {
  await mainToken(studioHome)
  const mainRef = `refs/heads/${liveBranch(join(root, 'repo.git'))}`
  const hooks = join(root, 'repo.git', 'hooks')
  await mkdir(hooks, { recursive: true })
  const file = join(hooks, 'reference-transaction')
  await writeFile(
    file,
    `#!/bin/sh
state="$1"
allowed=0
token_file=${JSON.stringify(mainTokenFile(studioHome))}
if [ -r "$token_file" ] && [ "$PIKKU_STUDIO_MAIN" = "$(cat "$token_file")" ]; then allowed=1; fi
while read -r old new ref; do
  if [ "$state" = "prepared" ] && [ "$ref" = "${mainRef}" ] && [ "$allowed" != "1" ]; then
    echo "main can only be changed by Studio. Make your change on develop and keep it." >&2
    exit 1
  fi
done
exit 0
`
  )
  await chmod(file, 0o755)
}

export const worktreeConfinement = (worktree: StudioWorktree): Confinement => ({
  root: worktree.path,
  writable: [worktree.gitDir],
  ...(basename(worktree.gitDir) === 'repo.git'
    ? {
        protected: [
          join(worktree.gitDir, 'hooks'),
          join(worktree.gitDir, 'config'),
          join(worktree.gitDir, 'packed-refs'),
          join(worktree.gitDir, 'refs', 'heads', liveBranch(worktree.gitDir)),
          join(worktree.gitDir, 'logs', 'refs', 'heads', liveBranch(worktree.gitDir)),
        ],
      }
    : {}),
})

export interface KeepStatus {
  folder: string
  target: string | null
  commits: { sha: string; subject: string }[]
  unsaved: number
}

export type KeepResult = { ok: true; kept: number } | { ok: false; reason: 'conflict' | 'edited'; files: string[] }

const SCRATCH = ['--', '.', ':(exclude,glob)**/.pikku/**']

const tryGit = (cwd: string, ...args: string[]) => tryGitEnv({}, cwd, ...args)

const tryGitEnv = (env: Record<string, string>, cwd: string, ...args: string[]) =>
  exec('git', args, { cwd, env: { ...process.env, ...env } }).then(
    (r) => ({ ok: true, output: r.stdout.trim() }),
    (e: { stdout?: string; stderr?: string }) => ({ ok: false, output: `${e.stdout ?? ''}\n${e.stderr ?? ''}`.trim() })
  )

const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean)

export async function keepStatus(repo: string, worktree: StudioWorktree): Promise<KeepStatus> {
  const folder = await git(repo, 'rev-parse', '--show-toplevel')
  const target = (await tryGit(folder, 'symbolic-ref', '--short', '-q', 'HEAD')).output || null
  const log = await git(folder, 'log', '--format=%h%x09%s', `HEAD..${worktree.branch}`)
  const unsaved = lines(await git(worktree.path, 'status', '--porcelain', ...SCRATCH)).length
  return { folder, target, unsaved, commits: lines(log).map((l) => ({ sha: l.split('\t')[0]!, subject: l.split('\t').slice(1).join('\t') })) }
}

export async function keepChanges(repo: string, worktree: StudioWorktree, env: Record<string, string> = {}): Promise<KeepResult> {
  const folder = await git(repo, 'rev-parse', '--show-toplevel')
  await trackLargeFiles(worktree.path).catch(() => [])
  await git(worktree.path, 'add', '-A', ...SCRATCH)
  const dirty = !(await tryGit(worktree.path, 'diff', '--cached', '--quiet')).ok
  if (dirty) {
    await git(worktree.path, ...IDENTITY, 'commit', '-q', '--no-verify', '-m', 'Changes from the builder')
  }
  if (resolve(worktree.path) === resolve(folder)) return { ok: true, kept: dirty ? 1 : 0 }
  const head = await git(folder, 'rev-parse', 'HEAD')
  const synced = await tryGit(worktree.path, ...IDENTITY, 'merge', '-q', '--no-edit', head)
  if (!synced.ok) {
    const files = lines(await git(worktree.path, 'diff', '--name-only', '--diff-filter=U'))
    await tryGit(worktree.path, 'merge', '--abort')
    return { ok: false, reason: 'conflict', files }
  }
  const kept = Number(await git(folder, 'rev-list', '--count', `HEAD..${worktree.branch}`))
  if (kept === 0) return { ok: true, kept }
  const merged = await tryGitEnv(env, folder, 'merge', '-q', '--ff-only', worktree.branch)
  if (!merged.ok) {
    const files = lines(merged.output).filter((l) => !/^(error|hint|fatal|Please|Aborting|Updating)\b/.test(l) && !l.endsWith(':'))
    return { ok: false, reason: 'edited', files }
  }
  return { ok: true, kept }
}

// `pikku changes` keeps its list inside the repo's .git, which a wake replaces with a fresh clone.
// A copy lives in the studio home (which survives) and goes back whenever the clone has none of its own.
const CHANGES_FILE = 'pikku-changes.json'

const hasChanges = async (file: string): Promise<boolean> => {
  try {
    const list = JSON.parse(await readFile(file, 'utf8')) as { changes?: unknown[]; groups?: unknown[] }
    return (list.changes?.length ?? 0) + (list.groups?.length ?? 0) > 0
  } catch {
    return false
  }
}

const repoChangesFile = async (repo: string) => join(resolve(repo, await git(repo, 'rev-parse', '--git-common-dir')), CHANGES_FILE)

async function restoreChanges(repo: string, studioHome: string): Promise<void> {
  try {
    const kept = join(studioHome, CHANGES_FILE)
    const live = await repoChangesFile(repo)
    if ((await hasChanges(kept)) && !(await hasChanges(live))) await copyFile(kept, live)
  } catch {
    // The change list is a convenience here; building must not wait on it.
  }
}

async function rememberChanges(repo: string, studioHome: string): Promise<void> {
  try {
    const live = await repoChangesFile(repo)
    if (await hasChanges(live)) await copyFile(live, join(studioHome, CHANGES_FILE))
  } catch {
    // Same: a copy that cannot be made is reported by the changes simply being gone, not by a failed sleep.
  }
}

export type SavedWorktree = { branch: string; committed: boolean; pushed: boolean; error?: string }

/**
 * Commit what the builder has in each worktree and push its branch. A sandbox that wakes re-clones
 * the repo, so a branch that only exists here is gone; one that is on the remote is picked up again
 * by `ensureWorktree`. Never throws: a worktree that cannot be saved is reported, not fatal.
 */
export async function saveWorktrees(studioHome: string): Promise<SavedWorktree[]> {
  const root = join(studioHome, 'worktrees')
  if (!existsSync(root)) return []
  const saved: SavedWorktree[] = []
  for (const name of (await readdir(root)).filter((n) => !n.includes('.stale-'))) {
    const path = join(root, name)
    const branch = await tryGit(path, 'symbolic-ref', '--short', '-q', 'HEAD')
    if (!branch.ok || !branch.output) continue
    await trackLargeFiles(path).catch(() => [])
    await tryGit(path, 'add', '-A', ...SCRATCH)
    const dirty = !(await tryGit(path, 'diff', '--cached', '--quiet')).ok
    if (dirty) {
      const done = await tryGit(path, ...IDENTITY, 'commit', '-q', '--no-verify', '-m', 'Save builder work')
      if (!done.ok) {
        saved.push({ branch: branch.output, committed: false, pushed: false, error: done.output })
        continue
      }
    }
    const pushed = await tryGit(path, 'push', '-q', 'origin', branch.output)
    saved.push({ branch: branch.output, committed: dirty, pushed: pushed.ok, ...(pushed.ok ? {} : { error: pushed.output }) })
    await rememberChanges(path, studioHome)
  }
  return saved
}

export type VersionCommit = { sha: string; title: string; summary: string; by: string; at: number }

const commits = async (folder: string, range: string, limit: number): Promise<VersionCommit[]> => {
  const out = await tryGit(folder, 'log', `-n${limit}`, '--format=%h%x1f%an%x1f%at%x1f%s%x1f%b%x1e', range)
  if (!out.ok) return []
  return out.output
    .split('\x1e')
    .map((record) => record.trim())
    .filter(Boolean)
    .map((record) => {
      const [sha = '', by = '', at = '0', title = '', summary = ''] = record.split('\x1f')
      return { sha, by, at: Number(at) * 1000, title, summary: summary.trim() }
    })
}

export async function listVersions(repo: string): Promise<{ live: VersionCommit[]; ahead: VersionCommit[] }> {
  const folder = await git(repo, 'rev-parse', '--show-toplevel')
  const common = resolve(folder, await git(folder, 'rev-parse', '--git-common-dir'))
  const live = basename(common) === 'repo.git' ? liveBranch(common) : MAIN
  const work = basename(common) === 'repo.git' ? workBranch(live) : DEVELOP
  return { live: await commits(folder, live, 30), ahead: await commits(folder, `${live}..${work}`, 30) }
}

export type ProjectTheme = { id: string; name: string; primary: string; secondary: string | null; background: string | null; foreground: string | null; heading: string; body: string; radius: string; scheme: string }

const readJson = async (file: string): Promise<Record<string, any> | null> => {
  try {
    return JSON.parse(await readFile(file, 'utf8'))
  } catch {
    return null
  }
}

export async function listThemes(repo: string): Promise<{ active: string; themes: ProjectTheme[] }> {
  const dir = join(repo, 'packages', 'theme')
  const active = (await readJson(join(dir, 'active.json')))?.id ?? ''
  const files = (await readdir(join(dir, 'themes')).catch(() => [] as string[])).filter((f) => f.endsWith('.json')).sort()
  const themes: ProjectTheme[] = []
  for (const file of files) {
    const theme = await readJson(join(dir, 'themes', file))
    if (!theme) continue
    const colors = theme.brand?.colors ?? {}
    themes.push({
      id: file.replace(/\.json$/, ''),
      name: String(theme.name ?? file.replace(/\.json$/, '')),
      primary: String(colors.primary ?? '#3b3f5c'),
      secondary: colors.secondary ? String(colors.secondary) : null,
      background: colors.background ? String(colors.background) : null,
      foreground: colors.foreground ? String(colors.foreground) : null,
      heading: String(theme.brand?.fonts?.heading ?? 'Inter'),
      body: String(theme.brand?.fonts?.body ?? 'Inter'),
      radius: String(theme.structure?.radius ?? 'md'),
      scheme: String(theme.structure?.defaultColorScheme ?? 'light'),
    })
  }
  return { active, themes }
}
