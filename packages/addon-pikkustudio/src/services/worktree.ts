import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { basename, dirname, isAbsolute, join, resolve } from 'node:path'
import { promisify } from 'node:util'
import type { Confinement } from './confine.js'
import { trackLargeFiles } from './lfs.js'

const exec = promisify(execFile)

const git = async (cwd: string, ...args: string[]) =>
  (await exec('git', args, { cwd })).stdout.trim()

const IDENTITY = ['-c', 'user.name=Pikku Studio', '-c', 'user.email=studio@pikku.dev']

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

export const layoutRoot = (path: string): string | null =>
  basename(path) === MAIN && existsSync(join(dirname(path), 'repo.git')) ? dirname(path) : null

async function addLayoutWorktrees(root: string, base: string, onMain?: (main: string) => Promise<void>): Promise<void> {
  const bare = join(root, 'repo.git')
  await git(bare, 'worktree', 'add', '-q', join(root, MAIN), base)
  await onMain?.(join(root, MAIN))
  const has = await git(bare, 'rev-parse', '--verify', '-q', `refs/heads/${DEVELOP}`).then(() => true, () => false)
  if (has) await git(bare, 'worktree', 'add', '-q', join(root, DEVELOP), DEVELOP)
  else await git(bare, 'worktree', 'add', '-q', '-b', DEVELOP, join(root, DEVELOP), MAIN)
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
  credential?: GitCredential
): Promise<void> {
  await mkdir(root, { recursive: true })
  await exec('git', ['clone', '-q', '--bare', '--', url, join(root, 'repo.git')], {
    cwd: root,
    env: { ...process.env, ...credentialEnv(credential), GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND ?? 'ssh -o BatchMode=yes -o ConnectTimeout=15' },
  })
  const bare = join(root, 'repo.git')
  await git(bare, 'config', 'remote.origin.fetch', '+refs/heads/*:refs/remotes/origin/*')
  const base = await git(bare, 'symbolic-ref', '--short', 'HEAD')
  if (base !== MAIN) await git(bare, 'branch', '-m', base, MAIN)
  await addLayoutWorktrees(root, MAIN, onMain)
  await guardMain(root, studioHome)
}

export const sessionKey = (id: string, worktree: string) => (worktree === DEVELOP ? id : `${id}.${worktree}`)

export const splitSessionKey = (key: string): { id: string; worktree: string } => {
  const dot = key.indexOf('.')
  return dot < 0 ? { id: key, worktree: DEVELOP } : { id: key.slice(0, dot), worktree: key.slice(dot + 1) }
}

const NAME = /^[a-z0-9][a-z0-9-]{0,39}$/

export async function addWorktree(root: string, name: string): Promise<void> {
  if (!NAME.test(name) || name === MAIN || name === DEVELOP) throw new Error(`"${name}" cannot be used as a worktree name`)
  if (existsSync(join(root, name))) throw new Error(`A worktree called "${name}" already exists`)
  await git(join(root, 'repo.git'), 'worktree', 'add', '-q', '-b', name, join(root, name), DEVELOP)
}

export async function listWorktrees(root: string): Promise<string[]> {
  const out = await git(join(root, 'repo.git'), 'worktree', 'list', '--porcelain')
  return lines(out)
    .filter((l) => l.startsWith('branch '))
    .map((l) => l.slice('branch refs/heads/'.length))
    .filter((b) => b !== MAIN)
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
  const prefix = await git(repo, 'rev-parse', '--show-prefix')
  const path = join(studioHome, 'worktrees', id)
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

const MAIN_REF = `refs/heads/${MAIN}`

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
  if [ "$state" = "prepared" ] && [ "$ref" = "${MAIN_REF}" ] && [ "$allowed" != "1" ]; then
    echo "main can only be changed by Pikku Studio. Make your change on develop and keep it." >&2
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
          join(worktree.gitDir, MAIN_REF),
          join(worktree.gitDir, 'logs', MAIN_REF),
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
  if (!(await tryGit(worktree.path, 'diff', '--cached', '--quiet')).ok) {
    await git(worktree.path, ...IDENTITY, 'commit', '-q', '--no-verify', '-m', 'Changes from the builder')
  }
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
  return { live: await commits(folder, MAIN, 30), ahead: await commits(folder, `${MAIN}..${DEVELOP}`, 30) }
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
