import { execFile } from 'node:child_process'
import { accessSync, constants, existsSync, realpathSync } from 'node:fs'
import { lstat, readdir, rm, stat, writeFile, mkdir } from 'node:fs/promises'
import { delimiter, isAbsolute, join, resolve, sep } from 'node:path'

/**
 * Removes the builder's finished session worktrees (`s-xxxx`) from a project layout.
 *
 * Studio picks the candidates itself, from `git worktree list` and git, and only hands the removal to
 * worktrunk (`wt remove`). `wt step prune` is not used: it can delete `main` when its target is `develop`,
 * counts `--min-age` from creation rather than from activity, and takes a fresh empty session for merged.
 * Anything that fails a check is kept and reported with the reason. Nothing is ever forced.
 */

/** A session worktree: the folder and branch name `createSession` gives. Nothing else is ever swept. */
export const SESSION = /^s-[0-9a-f]{4}$/

export const DEFAULT_IDLE_MS = 7 * 24 * 60 * 60 * 1000

const MAX_SCANNED = 200_000

export interface SweepOptions {
  /** The layout root: holds `repo.git`, `main`, `develop` and the worktrees. */
  root: string
  /** Studio's home: where the design copies and logs of a session live. */
  home: string
  /** Report only unless this is true. */
  remove?: boolean
  /** How long a session must have been left alone, measured from its last activity. */
  idleMs?: number
  /** The `wt` binary: an explicit path, else the first one on PATH. */
  wt?: string
  now?: number
  /** The key Studio knows a session worktree by (`<id>.<name>`). */
  keyOf: (name: string) => string
  /** Studio's own knowledge of a running session (supervisor, dev server, apps). */
  isLive?: (key: string) => boolean
  /** Called after a successful removal, once the session's files are cleaned up. */
  onRemoved?: (key: string) => void | Promise<void>
}

export type SweepEntry = {
  name: string
  key: string
  path: string
  action: 'removed' | 'would-remove' | 'kept'
  reasons: string[]
}

export type BranchEntry = {
  name: string
  action: 'deleted' | 'would-delete' | 'kept'
  reasons: string[]
}

export interface SweepReport {
  root: string
  dryRun: boolean
  entries: SweepEntry[]
  /** Leftover `s-xxxx` branches with no worktree (what a removal leaves behind). */
  branches: BranchEntry[]
  /** Set when the sweep could not run at all (no `wt`, no layout); nothing was touched. */
  error?: string
}

type Exec = { code: number; stdout: string; stderr: string }

const run = (command: string, args: string[], cwd: string, env?: NodeJS.ProcessEnv): Promise<Exec> =>
  new Promise((done) => {
    execFile(command, args, { cwd, env: env ?? process.env, maxBuffer: 64 * 1024 * 1024 }, (error, stdout, stderr) => {
      const code = error ? (typeof (error as { code?: unknown }).code === 'number' ? ((error as { code: number }).code) : -1) : 0
      done({ code, stdout: String(stdout), stderr: String(stderr) })
    })
  })

/**
 * Every git call of the sweep is read-only: `--no-optional-locks` stops `git status` from rewriting the worktree's
 * index, whose mtime `lastActivity` counts as use. Without it the sweep would bump the very clock it reads.
 */
const git = (cwd: string, ...args: string[]) =>
  run('git', ['--no-optional-locks', ...args], cwd, { ...process.env, GIT_OPTIONAL_LOCKS: '0' })

export function resolveWt(configured?: string): string | null {
  const usable = (file: string) => {
    try {
      accessSync(file, constants.X_OK)
      return true
    } catch {
      return false
    }
  }
  if (configured) return isAbsolute(configured) && usable(configured) ? configured : null
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (dir && usable(join(dir, 'wt'))) return join(dir, 'wt')
  }
  return null
}

type Listed = { path: string; branch: string | null; locked: boolean }

const parseWorktrees = (porcelain: string): Listed[] =>
  porcelain
    .split(/\n\s*\n/)
    .map((block) => block.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((lines) => lines.some((l) => l.startsWith('worktree ')))
    .map((lines) => ({
      path: lines.find((l) => l.startsWith('worktree '))!.slice('worktree '.length),
      branch: lines.find((l) => l.startsWith('branch '))?.slice('branch refs/heads/'.length) ?? null,
      locked: lines.some((l) => l === 'locked' || l.startsWith('locked ')),
    }))

/** Folders holding a process's working directory, from one `lsof` call. Null when it could not be asked. */
async function processDirs(): Promise<string[] | null> {
  const out = await run('lsof', ['-nP', '-d', 'cwd', '-Fn'], process.cwd())
  if (!out.stdout) return null
  return out.stdout
    .split('\n')
    .filter((l) => l.startsWith('n'))
    .map((l) => l.slice(1))
}

const inside = (dir: string, folder: string) => dir === folder || dir.startsWith(folder + sep)

const real = (path: string) => {
  try {
    return realpathSync(path)
  } catch {
    return resolve(path)
  }
}

async function newestFile(dir: string, newerThan: number): Promise<{ newest: number; capped: boolean }> {
  let newest = 0
  let seen = 0
  const stack = [dir]
  while (stack.length) {
    const here = stack.pop()!
    const info = await lstat(here).catch(() => null)
    if (info) newest = Math.max(newest, info.mtimeMs)
    if (newest >= newerThan) return { newest, capped: false }
    const names = await readdir(here, { withFileTypes: true }).catch(() => [])
    for (const entry of names) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue
      if (++seen > MAX_SCANNED) return { newest, capped: true }
      const full = join(here, entry.name)
      if (entry.isDirectory()) stack.push(full)
      else {
        const file = await lstat(full).catch(() => null)
        if (file) newest = Math.max(newest, file.mtimeMs)
        if (newest >= newerThan) return { newest, capped: false }
      }
    }
  }
  return { newest, capped: false }
}

const mtime = async (file: string) => (await stat(file).catch(() => null))?.mtimeMs ?? 0

/** The newest of the last commit, the index, the worktree's reflog and any file written in it (not node_modules or .git). */
async function lastActivity(path: string, bare: string, branch: string, newerThan: number): Promise<{ at: number; capped: boolean }> {
  const commit = Number((await git(bare, 'log', '-1', '--format=%ct', `refs/heads/${branch}`)).stdout.trim() || 0) * 1000
  const gitDir = (await git(path, 'rev-parse', '--absolute-git-dir')).stdout.trim()
  const index = (await git(path, 'rev-parse', '--git-path', 'index')).stdout.trim()
  const meta = Math.max(
    commit,
    index ? await mtime(resolve(path, index)) : 0,
    gitDir ? await mtime(join(gitDir, 'HEAD')) : 0,
    gitDir ? await mtime(join(gitDir, 'logs', 'HEAD')) : 0
  )
  if (meta >= newerThan) return { at: meta, capped: false }
  const files = await newestFile(path, newerThan)
  return { at: Math.max(meta, files.newest), capped: files.capped }
}

const KEY = /^[A-Za-z0-9_-]+\.s-[0-9a-f]{4}$/

/** Delete what a session left in Studio's home: its design copy and its design log. */
export async function cleanupSessionFiles(home: string, key: string): Promise<void> {
  if (!KEY.test(key)) return
  await rm(join(home, 'design', key), { recursive: true, force: true })
  await rm(join(home, 'logs', `${key}-design.log`), { force: true })
}

export const worktrunkConfigFile = (home: string) => join(home, 'worktrunk-empty.toml')

async function removeWith(wt: string, bare: string, name: string, path: string, home: string): Promise<string | null> {
  await mkdir(home, { recursive: true })
  const config = worktrunkConfigFile(home)
  await writeFile(config, '')
  const out = await run(wt, ['remove', name, '--foreground', '--no-hooks', '--format', 'json', '--config', config], bare)
  if (out.code !== 0) return `wt remove failed (${out.code}): ${(out.stderr || out.stdout).trim().split('\n').slice(-3).join(' ')}`
  try {
    JSON.parse(out.stdout)
  } catch {
    if (existsSync(path)) return 'wt remove gave no readable result and the folder is still there'
  }
  return existsSync(path) ? 'wt remove finished but the folder is still there' : null
}

/** Why a session branch must stay, or null when it is merged into develop, on no worktree and nowhere unpushed. */
async function branchKeepReason(bare: string, name: string, live: string): Promise<string | null> {
  if (!SESSION.test(name) || name === 'main' || name === 'develop' || name === live) return 'not a session branch'
  const merged = await git(bare, 'merge-base', '--is-ancestor', `refs/heads/${name}`, 'refs/heads/develop')
  if (merged.code === 1) return 'not merged into develop'
  if (merged.code !== 0) return 'could not check whether it is merged into develop'
  const unpushed = await git(bare, 'rev-list', '--count', `refs/heads/${name}`, '--not', 'refs/heads/develop', '--remotes')
  if (unpushed.code !== 0) return 'could not check for unpushed commits'
  if (Number(unpushed.stdout.trim()) > 0) return `has ${unpushed.stdout.trim()} commit(s) not on develop or a remote`
  return null
}

/** `git branch -d` (never -D) from the develop worktree, so git itself re-checks that it is merged into develop. */
async function deleteBranch(root: string, bare: string, name: string): Promise<string | null> {
  const develop = join(root, 'develop')
  const out = await git(existsSync(develop) ? develop : bare, 'branch', '-d', name)
  return out.code === 0 ? null : `git branch -d failed: ${(out.stderr || out.stdout).trim().split('\n').slice(-1)[0]}`
}

export async function sweepSessions(options: SweepOptions): Promise<SweepReport> {
  const { root, home } = options
  const bare = join(root, 'repo.git')
  const dryRun = options.remove !== true
  const idleMs = options.idleMs ?? DEFAULT_IDLE_MS
  const now = options.now ?? Date.now()
  const report: SweepReport = { root, dryRun, entries: [], branches: [] }
  const wt = resolveWt(options.wt)
  if (!wt) return { ...report, error: 'wt not available' }
  if (!existsSync(bare)) return { ...report, error: 'no layout here' }
  const listed = await git(bare, 'worktree', 'list', '--porcelain')
  if (listed.code !== 0) return { ...report, error: `git worktree list failed: ${listed.stderr.trim()}` }
  const live = (await git(bare, 'symbolic-ref', '--short', 'HEAD')).stdout.trim()
  const rootDir = real(root)
  const candidates = parseWorktrees(listed.stdout).filter(
    (w) =>
      w.branch !== null &&
      SESSION.test(w.branch) &&
      w.branch !== 'main' &&
      w.branch !== 'develop' &&
      w.branch !== live &&
      real(w.path) === join(rootDir, w.branch)
  )
  const checkedOut = new Set(parseWorktrees(listed.stdout).map((w) => w.branch))
  const heads = await git(bare, 'for-each-ref', '--format=%(refname:short)', 'refs/heads')
  const orphans = heads.code === 0 ? heads.stdout.split('\n').map((l) => l.trim()).filter((n) => SESSION.test(n) && !checkedOut.has(n)) : []
  const sweepBranches = async () => {
    for (const name of orphans) {
      const why = await branchKeepReason(bare, name, live)
      if (why) {
        report.branches.push({ name, action: 'kept', reasons: [why] })
        continue
      }
      if (dryRun) {
        report.branches.push({ name, action: 'would-delete', reasons: [] })
        continue
      }
      const failure = await deleteBranch(root, bare, name)
      report.branches.push(failure ? { name, action: 'kept', reasons: [failure] } : { name, action: 'deleted', reasons: [] })
    }
  }
  if (!candidates.length) {
    await sweepBranches()
    return report
  }
  const dirs = await processDirs()

  for (const w of candidates) {
    const name = w.branch!
    const key = options.keyOf(name)
    const path = join(root, name)
    const reasons: string[] = []

    const merged = await git(bare, 'merge-base', '--is-ancestor', `refs/heads/${name}`, 'refs/heads/develop')
    if (merged.code === 1) reasons.push('not merged into develop')
    else if (merged.code !== 0) reasons.push('could not check whether it is merged into develop')

    const status = await git(path, 'status', '--porcelain', '--untracked-files=all')
    if (status.code !== 0) reasons.push('could not read its status')
    else if (status.stdout.trim()) reasons.push('has unsaved or untracked changes')

    const unpushed = await git(bare, 'rev-list', '--count', `refs/heads/${name}`, '--not', 'refs/heads/develop', '--remotes')
    if (unpushed.code !== 0) reasons.push('could not check for unpushed commits')
    else if (Number(unpushed.stdout.trim()) > 0) reasons.push(`has ${unpushed.stdout.trim()} commit(s) not on develop or a remote`)

    if (w.locked) reasons.push('is locked')
    if (options.isLive?.(key)) reasons.push('is running in Studio')
    if (dirs === null) reasons.push('could not check for running processes')
    else if (dirs.some((d) => inside(d, real(path)))) reasons.push('a process is running in it')

    if (!reasons.length) {
      const { at, capped } = await lastActivity(path, bare, name, now - idleMs)
      if (capped) reasons.push('too many files to tell when it was last used')
      else if (now - at < idleMs) reasons.push(`used ${Math.max(0, Math.round((now - at) / 3_600_000))}h ago, idle limit is ${Math.round(idleMs / 3_600_000)}h`)
    }

    if (reasons.length) {
      report.entries.push({ name, key, path, action: 'kept', reasons })
      continue
    }
    if (dryRun) {
      report.entries.push({ name, key, path, action: 'would-remove', reasons: [] })
      continue
    }
    const failure = await removeWith(wt, bare, name, path, home)
    if (failure) {
      report.entries.push({ name, key, path, action: 'kept', reasons: [failure] })
      continue
    }
    // wt leaves the branch behind. Delete it only when it is still fully merged into develop.
    if (!(await branchKeepReason(bare, name, live))) await deleteBranch(root, bare, name)
    await cleanupSessionFiles(home, key)
    await options.onRemoved?.(key)
    report.entries.push({ name, key, path, action: 'removed', reasons: [] })
  }
  await sweepBranches()
  return report
}
