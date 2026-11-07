import assert from 'node:assert/strict'
import { execFileSync, spawn } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { addWorktree, commitPaths, createLayout, freshSessionName } from '../../src/services/worktree.js'
import { SESSION, cleanupSessionFiles, resolveWt, sweepSessions, worktrunkConfigFile, type SweepOptions } from '../../src/services/worktree-sweep.js'

const DAY = 24 * 60 * 60 * 1000
const sh = (cwd: string, ...args: string[]) => execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd, encoding: 'utf8' }).trim()

const layout = async () => {
  const base = mkdtempSync(join(tmpdir(), 'sweep-'))
  const home = join(base, 'home')
  mkdirSync(home)
  const root = join(base, 'p1')
  const scaffold = join(root, '.scaffold', 'app')
  mkdirSync(scaffold, { recursive: true })
  writeFileSync(join(scaffold, 'a.txt'), 'one\n')
  await commitPaths(scaffold, ['.'], 'Start')
  await createLayout(root, scaffold, home)
  return { base, home, root }
}

/** A fake `wt` that records how it was called and removes the worktree the way wt does. */
const fakeWt = (base: string, exit = 0) => {
  const file = join(base, 'wt')
  const log = join(base, 'wt.log')
  writeFileSync(file, `#!/bin/sh\necho "$PWD :: $@" >> "${log}"\n[ ${exit} -ne 0 ] && { echo boom >&2; exit ${exit}; }\ngit worktree remove "$(dirname "$PWD")/$2" || exit 1\necho '{"removed":true}'\n`)
  chmodSync(file, 0o755)
  return { file, log }
}

const session = async (root: string, name: string, how: { commit?: boolean; merge?: boolean; dirty?: boolean } = {}) => {
  await addWorktree(root, name)
  const path = join(root, name)
  if (how.commit || how.merge) {
    writeFileSync(join(path, `${name}.txt`), 'work\n')
    sh(path, 'add', '-A')
    sh(path, 'commit', '-q', '-m', `work ${name}`)
  }
  if (how.merge) sh(join(root, 'develop'), 'merge', '-q', '--ff-only', name)
  if (how.dirty) writeFileSync(join(path, 'untracked.txt'), 'x\n')
  return path
}

const sweep = (extra: Partial<SweepOptions> & Pick<SweepOptions, 'root' | 'home'>) =>
  sweepSessions({ keyOf: (n) => `p1.${n}`, now: Date.now() + 8 * DAY, ...extra })

const only = (report: Awaited<ReturnType<typeof sweep>>, name: string) => report.entries.find((e) => e.name === name)

describe('session sweep', () => {
  test('merged, clean and idle is removed, with its design copy and log, and wt is called safely', async () => {
    const { base, home, root } = await layout()
    const { file, log } = fakeWt(base)
    const path = await session(root, 's-aaaa', { merge: true })
    mkdirSync(join(home, 'design', 'p1.s-aaaa'), { recursive: true })
    mkdirSync(join(home, 'logs'), { recursive: true })
    writeFileSync(join(home, 'logs', 'p1.s-aaaa-design.log'), 'x')
    const forgotten: string[] = []
    const report = await sweep({ root, home, wt: file, remove: true, onRemoved: (k) => void forgotten.push(k) })
    assert.equal(only(report, 's-aaaa')?.action, 'removed')
    assert.equal(existsSync(path), false)
    assert.equal(existsSync(join(home, 'design', 'p1.s-aaaa')), false)
    assert.equal(existsSync(join(home, 'logs', 'p1.s-aaaa-design.log')), false)
    assert.deepEqual(forgotten, ['p1.s-aaaa'])
    const call = readFileSync(log, 'utf8')
    assert.match(call, /repo\.git :: remove s-aaaa --foreground --no-hooks --format json --config .*worktrunk-empty\.toml/)
    assert.doesNotMatch(call, / -f\b| -D\b|--force|--reap/)
    assert.equal(readFileSync(worktrunkConfigFile(home), 'utf8'), '')
    assert.ok(existsSync(join(root, 'main')) && existsSync(join(root, 'develop')))
  })

  test('unmerged work is kept, and so is unpushed work', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    const path = await session(root, 's-bbbb', { commit: true })
    const report = await sweep({ root, home, wt: file, remove: true })
    const entry = only(report, 's-bbbb')!
    assert.equal(entry.action, 'kept')
    assert.ok(entry.reasons.includes('not merged into develop'))
    assert.ok(entry.reasons.some((r) => /commit\(s\) not on develop or a remote/.test(r)))
    assert.ok(existsSync(path))
  })

  test('a session with an untracked file is kept', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    const path = await session(root, 's-cccc', { merge: true, dirty: true })
    const entry = only(await sweep({ root, home, wt: file, remove: true }), 's-cccc')!
    assert.equal(entry.action, 'kept')
    assert.deepEqual(entry.reasons, ['has unsaved or untracked changes'])
    assert.ok(existsSync(path))
  })

  test('a session with a live process in it is kept', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    const path = await session(root, 's-dddd', { merge: true })
    const child = spawn('sleep', ['60'], { cwd: path, stdio: 'ignore' })
    try {
      await new Promise((r) => setTimeout(r, 300))
      const entry = only(await sweep({ root, home, wt: file, remove: true }), 's-dddd')!
      assert.equal(entry.action, 'kept')
      assert.deepEqual(entry.reasons, ['a process is running in it'])
      assert.ok(existsSync(path))
    } finally {
      child.kill('SIGKILL')
    }
  })

  test('a session Studio says is running is kept', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    const path = await session(root, 's-eeee', { merge: true })
    const entry = only(await sweep({ root, home, wt: file, remove: true, isLive: (k) => k === 'p1.s-eeee' }), 's-eeee')!
    assert.deepEqual(entry.reasons, ['is running in Studio'])
    assert.ok(existsSync(path))
  })

  test('recent activity keeps a session, including a fresh empty one that looks merged', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    const path = await session(root, 's-ffff')
    const merged = await session(root, 's-1111', { merge: true })
    const report = await sweep({ root, home, wt: file, remove: true, now: Date.now() + 1 * DAY })
    for (const name of ['s-ffff', 's-1111']) {
      const entry = only(report, name)!
      assert.equal(entry.action, 'kept', name)
      assert.match(entry.reasons[0]!, /idle limit/)
    }
    assert.ok(existsSync(path) && existsSync(merged))
  })

  test('a file written recently keeps a session whose commits are old', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    await session(root, 's-2222', { merge: true })
    // Ignored by git but written to: the builder's scratch is activity, three days before the sweep.
    writeFileSync(join(root, 's-2222', '.gitignore'), 'scratch.log\n')
    sh(join(root, 's-2222'), 'add', '.gitignore')
    sh(join(root, 's-2222'), 'commit', '-q', '-m', 'ignore')
    sh(join(root, 'develop'), 'merge', '-q', '--ff-only', 's-2222')
    const scratch = join(root, 's-2222', 'scratch.log')
    writeFileSync(scratch, 'x')
    const written = new Date(Date.now() + 5 * DAY)
    utimesSync(scratch, written, written)
    const old = new Date(Date.now() - 30 * DAY)
    for (const f of ['s-2222.txt', '.gitignore', 'a.txt']) utimesSync(join(root, 's-2222', f), old, old)
    const entry = only(await sweep({ root, home, wt: file, remove: true, now: Date.now() + 8 * DAY, idleMs: 7 * DAY }), 's-2222')!
    assert.equal(entry.action, 'kept')
    assert.match(entry.reasons[0]!, /idle limit/)
  })

  test('main, develop and named workspaces are never candidates', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    await addWorktree(root, 'feature')
    await addWorktree(root, 's-xyz')
    const report = await sweep({ root, home, wt: file, remove: true })
    assert.deepEqual(report.entries, [])
    for (const name of ['main', 'develop', 'feature', 's-xyz']) assert.ok(existsSync(join(root, name)), name)
    assert.equal(SESSION.test('main'), false)
    assert.equal(SESSION.test('develop'), false)
    assert.equal(SESSION.test('feature'), false)
  })

  test('a dry run removes nothing and says what it would remove', async () => {
    const { base, home, root } = await layout()
    const { file, log } = fakeWt(base)
    const path = await session(root, 's-3333', { merge: true })
    const report = await sweep({ root, home, wt: file })
    assert.equal(report.dryRun, true)
    assert.equal(only(report, 's-3333')?.action, 'would-remove')
    assert.ok(existsSync(path))
    assert.equal(existsSync(log), false)
  })

  test('without wt the sweep reports it and touches nothing', async () => {
    const { home, root } = await layout()
    const path = await session(root, 's-4444', { merge: true })
    const report = await sweep({ root, home, wt: '/nonexistent/bin/wt', remove: true })
    assert.equal(report.error, 'wt not available')
    assert.deepEqual(report.entries, [])
    assert.ok(existsSync(path))
  })

  test('a wt that fails leaves the session kept and reported', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base, 3)
    const path = await session(root, 's-5555', { merge: true })
    const entry = only(await sweep({ root, home, wt: file, remove: true }), 's-5555')!
    assert.equal(entry.action, 'kept')
    assert.match(entry.reasons[0]!, /wt remove failed \(3\)/)
    assert.ok(existsSync(path))
  })

  test('cleanup never reaches outside the session files', async () => {
    const { home } = await layout()
    mkdirSync(join(home, 'design', 'p1'), { recursive: true })
    await cleanupSessionFiles(home, 'p1')
    await cleanupSessionFiles(home, '../p1.s-aaaa')
    assert.ok(existsSync(join(home, 'design', 'p1')))
  })

  test('with the real wt, a merged idle session goes and main and develop stay', { skip: resolveWt() === null && 'wt is not installed' }, async () => {
    const { home, root } = await layout()
    const path = await session(root, 's-6666', { merge: true })
    const report = await sweep({ root, home, remove: true })
    assert.equal(only(report, 's-6666')?.action, 'removed', JSON.stringify(report))
    assert.equal(existsSync(path), false)
    assert.ok(existsSync(join(root, 'main')) && existsSync(join(root, 'develop')))
  })

  test('the sweep does not touch the index: two runs agree and its mtime is unchanged', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    const path = await session(root, 's-7777', { merge: true })
    const index = sh(path, 'rev-parse', '--absolute-git-dir') + '/index'
    const idleMs = 2000
    await new Promise((r) => setTimeout(r, 2500))
    const before = statSync(index).mtimeMs
    const first = await sweepSessions({ root, home, wt: file, keyOf: (n) => `p1.${n}`, idleMs })
    await new Promise((r) => setTimeout(r, 1200))
    const second = await sweepSessions({ root, home, wt: file, keyOf: (n) => `p1.${n}`, idleMs })
    assert.equal(only(first, 's-7777')?.action, 'would-remove', JSON.stringify(first))
    assert.equal(only(second, 's-7777')?.action, 'would-remove', JSON.stringify(second))
    assert.equal(statSync(index).mtimeMs, before)
  })

  test('removing a merged session also deletes its branch, an unmerged one survives', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    await session(root, 's-8888', { merge: true })
    await session(root, 's-9999', { commit: true })
    const report = await sweep({ root, home, wt: file, remove: true })
    assert.equal(only(report, 's-8888')?.action, 'removed')
    const heads = sh(join(root, 'develop'), 'branch', '--format=%(refname:short)').split('\n')
    assert.ok(!heads.includes('s-8888'))
    assert.ok(heads.includes('s-9999'))
    assert.ok(existsSync(join(root, 's-9999')))
  })

  test('orphaned merged session branches are cleared; unmerged, odd names and dry runs are left alone', async () => {
    const { base, home, root } = await layout()
    const { file } = fakeWt(base)
    const develop = join(root, 'develop')
    sh(develop, 'branch', 's-abcd')
    sh(develop, 'branch', 's-abc')
    sh(develop, 'branch', 'feature')
    sh(develop, 'switch', '-q', '-c', 'tmp')
    writeFileSync(join(develop, 'x.txt'), 'x\n')
    sh(develop, 'add', '-A')
    sh(develop, 'commit', '-q', '-m', 'x')
    sh(develop, 'branch', 's-beef')
    sh(develop, 'switch', '-q', 'develop')
    sh(develop, 'branch', '-q', '-D', 'tmp')
    const names = () => sh(develop, 'branch', '--format=%(refname:short)').split('\n')
    const dry = await sweep({ root, home, wt: file })
    assert.equal(dry.branches.find((b) => b.name === 's-beef')?.action, 'kept')
    assert.deepEqual(dry.branches.find((b) => b.name === 's-beef')?.reasons, ['not merged into develop'])
    assert.equal(dry.branches.find((b) => b.name === 's-abcd')?.action, 'would-delete')
    assert.ok(names().includes('s-abcd'))
    const real = await sweep({ root, home, wt: file, remove: true })
    assert.equal(real.branches.find((b) => b.name === 's-abcd')?.action, 'deleted')
    const after = names()
    assert.ok(!after.includes('s-abcd'))
    for (const keep of ['s-beef', 's-abc', 'feature', 'main', 'develop']) assert.ok(after.includes(keep), keep)
  })

  test('createSession names skip existing branches and folders', async () => {
    const { root } = await layout()
    sh(join(root, 'develop'), 'branch', 's-0001')
    const names = ['s-0001', 's-0001', 's-0002']
    const got = await freshSessionName(root, () => names.shift()!)
    assert.equal(got, 's-0002')
  })
})
