import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { ensureWorktree, keepChanges, keepStatus, saveWorktrees } from '../../src/services/worktree.js'

const setup = async () => {
  const repo = mkdtempSync(join(tmpdir(), 'studio-keep-'))
  const sh = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
  sh(repo, 'init', '-q', '-b', 'main')
  writeFileSync(join(repo, 'app.ts'), 'one\n')
  sh(repo, 'add', '-A')
  sh(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'start')
  const worktree = await ensureWorktree(repo, mkdtempSync(join(tmpdir(), 'studio-home-')), 'k1')
  return { repo, worktree, sh }
}

describe('keepChanges', () => {
  test('saves unsaved work and fast-forwards the folder, leaving builder scratch behind', async () => {
    const { repo, worktree, sh } = await setup()
    writeFileSync(join(worktree.path, 'app.ts'), 'two\n')
    execFileSync('mkdir', ['-p', join(worktree.path, '.pikku')])
    writeFileSync(join(worktree.path, '.pikku/looks.json'), '{}')
    assert.equal((await keepStatus(repo, worktree)).unsaved, 1)
    assert.deepEqual(await keepChanges(repo, worktree), { ok: true, kept: 1 })
    assert.equal(readFileSync(join(repo, 'app.ts'), 'utf8'), 'two\n')
    assert.equal(sh(repo, 'log', '-1', '--format=%s'), 'Changes from the builder')
    assert.deepEqual((await keepStatus(repo, worktree)).commits, [])
  })

  test('brings in what the folder moved on to before keeping', async () => {
    const { repo, worktree, sh } = await setup()
    writeFileSync(join(repo, 'notes.md'), 'mine\n')
    sh(repo, 'add', '-A')
    sh(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'mine')
    writeFileSync(join(worktree.path, 'app.ts'), 'two\n')
    assert.equal((await keepChanges(repo, worktree)).ok, true)
    assert.equal(readFileSync(join(repo, 'notes.md'), 'utf8'), 'mine\n')
    assert.equal(readFileSync(join(repo, 'app.ts'), 'utf8'), 'two\n')
  })

  test('a clash with the folder names the files and changes nothing', async () => {
    const { repo, worktree, sh } = await setup()
    writeFileSync(join(repo, 'app.ts'), 'mine\n')
    sh(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qam', 'mine')
    writeFileSync(join(worktree.path, 'app.ts'), 'theirs\n')
    assert.deepEqual(await keepChanges(repo, worktree), { ok: false, reason: 'conflict', files: ['app.ts'] })
    assert.equal(readFileSync(join(repo, 'app.ts'), 'utf8'), 'mine\n')
    assert.equal(sh(worktree.path, 'status', '--porcelain'), '')
  })

  test('unsaved edits in the folder block the keep and are named', async () => {
    const { repo, worktree } = await setup()
    writeFileSync(join(repo, 'app.ts'), 'editing\n')
    writeFileSync(join(worktree.path, 'app.ts'), 'two\n')
    assert.deepEqual(await keepChanges(repo, worktree), { ok: false, reason: 'edited', files: ['app.ts'] })
    assert.equal(readFileSync(join(repo, 'app.ts'), 'utf8'), 'editing\n')
  })
})

describe('ensureWorktree after the checkout was replaced', () => {
  test('sets a worktree folder whose git directory is gone aside and makes a fresh one', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'studio-wake-'))
    const home = mkdtempSync(join(tmpdir(), 'studio-home-'))
    const sh = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
    sh(repo, 'init', '-q', '-b', 'main')
    writeFileSync(join(repo, 'app.ts'), 'one\n')
    sh(repo, 'add', '-A')
    sh(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'start')
    const first = await ensureWorktree(repo, home, 'k1')
    writeFileSync(join(first.path, 'draft.ts'), 'unsaved\n')
    // A wake re-clones the repo: the worktree's admin directory goes, its folder stays.
    rmSync(join(repo, '.git', 'worktrees'), { recursive: true, force: true })
    const again = await ensureWorktree(repo, home, 'k1')
    assert.equal(again.path, first.path)
    assert.equal(readFileSync(join(again.path, 'app.ts'), 'utf8'), 'one\n')
    assert.equal(existsSync(join(again.path, 'draft.ts')), false)
    const kept = readdirSync(join(home, 'worktrees')).filter((n) => n.startsWith('k1.stale-'))
    assert.equal(kept.length, 1)
    assert.equal(readFileSync(join(home, 'worktrees', kept[0], 'draft.ts'), 'utf8'), 'unsaved\n')
  })
})

describe('builder work across a wake', () => {
  test('saved work is pushed, and a re-cloned repo carries on from it', async () => {
    const sh = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
    const id = ['-c', 'user.name=t', '-c', 'user.email=t@t']
    const remote = mkdtempSync(join(tmpdir(), 'studio-remote-'))
    sh(remote, 'init', '-q', '--bare', '-b', 'main')
    const seed = mkdtempSync(join(tmpdir(), 'studio-seed-'))
    sh(seed, 'init', '-q', '-b', 'main')
    writeFileSync(join(seed, 'app.ts'), 'one\n')
    sh(seed, 'add', '-A')
    sh(seed, ...id, 'commit', '-q', '-m', 'start')
    sh(seed, 'remote', 'add', 'origin', remote)
    sh(seed, 'push', '-q', 'origin', 'main')

    const home = mkdtempSync(join(tmpdir(), 'studio-home-'))
    // Like the sandbox's clone: it follows only the main branch, not the builder's.
    const clone = (dir: string) => execFileSync('git', ['clone', '-q', '--single-branch', '-b', 'main', remote, dir])
    const first = join(mkdtempSync(join(tmpdir(), 'studio-clone-')), 'repo')
    clone(first)
    const worktree = await ensureWorktree(first, home, 'k1')
    writeFileSync(join(worktree.path, 'orders.ts'), 'orders\n')
    const saved = await saveWorktrees(home)
    assert.deepEqual(saved.map((s) => [s.branch, s.committed, s.pushed]), [['studio/k1', true, true]])
    assert.match(sh(remote, 'branch', '--list', 'studio/k1'), /studio\/k1/)

    // The sandbox wakes: the repo is cloned afresh and the worktree folder is left over from before.
    rmSync(first, { recursive: true, force: true })
    const second = join(mkdtempSync(join(tmpdir(), 'studio-clone-')), 'repo')
    clone(second)
    const again = await ensureWorktree(second, home, 'k1')
    assert.equal(readFileSync(join(again.path, 'orders.ts'), 'utf8'), 'orders\n')
    assert.equal(readFileSync(join(again.path, 'app.ts'), 'utf8'), 'one\n')
  })

  test('the change list is carried across a re-clone', async () => {
    const sh = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
    const remote = mkdtempSync(join(tmpdir(), 'studio-remote-'))
    sh(remote, 'init', '-q', '--bare', '-b', 'main')
    const seed = mkdtempSync(join(tmpdir(), 'studio-seed-'))
    sh(seed, 'init', '-q', '-b', 'main')
    writeFileSync(join(seed, 'app.ts'), 'one\n')
    sh(seed, 'add', '-A')
    sh(seed, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'start')
    sh(seed, 'remote', 'add', 'origin', remote)
    sh(seed, 'push', '-q', 'origin', 'main')
    const home = mkdtempSync(join(tmpdir(), 'studio-home-'))
    const clone = (dir: string) => execFileSync('git', ['clone', '-q', '--single-branch', '-b', 'main', remote, dir])
    const first = join(mkdtempSync(join(tmpdir(), 'studio-clone-')), 'repo')
    clone(first)
    const worktree = await ensureWorktree(first, home, 'k1')
    const list = { nextShortId: 2, changes: [{ shortId: 'c1', title: 'Buttons are green' }], groups: [], messages: [] }
    writeFileSync(join(first, '.git', 'pikku-changes.json'), JSON.stringify(list))
    writeFileSync(join(worktree.path, 'orders.ts'), 'orders\n')
    await saveWorktrees(home)

    rmSync(first, { recursive: true, force: true })
    const second = join(mkdtempSync(join(tmpdir(), 'studio-clone-')), 'repo')
    clone(second)
    // Something read the list before the builder was asked for: the clone has an empty one by now.
    writeFileSync(join(second, '.git', 'pikku-changes.json'), JSON.stringify({ nextShortId: 1, changes: [], groups: [], messages: [] }))
    await ensureWorktree(second, home, 'k1')
    assert.deepEqual(JSON.parse(readFileSync(join(second, '.git', 'pikku-changes.json'), 'utf8')), list)
  })

  test('a worktree that cannot be pushed is reported, not thrown', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'studio-nopush-'))
    const home = mkdtempSync(join(tmpdir(), 'studio-home-'))
    const sh = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
    sh(repo, 'init', '-q', '-b', 'main')
    writeFileSync(join(repo, 'app.ts'), 'one\n')
    sh(repo, 'add', '-A')
    sh(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'start')
    const worktree = await ensureWorktree(repo, home, 'k1')
    writeFileSync(join(worktree.path, 'draft.ts'), 'x\n')
    const [result] = await saveWorktrees(home)
    assert.equal(result.committed, true)
    assert.equal(result.pushed, false)
    assert.ok(result.error)
  })
})

describe('a workspace checkout worked in place', () => {
  test('the builder works on the checkout branch itself, and keeping commits there', async () => {
    const repo = mkdtempSync(join(tmpdir(), 'studio-inplace-'))
    const sh = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim()
    sh(repo, 'init', '-q', '-b', 'develop')
    writeFileSync(join(repo, 'app.ts'), 'one\n')
    sh(repo, 'add', '-A')
    sh(repo, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'start')
    process.env.PIKKU_STUDIO_IN_PLACE = '1'
    try {
      const worktree = await ensureWorktree(repo, mkdtempSync(join(tmpdir(), 'studio-home-')), 'app')
      assert.equal(worktree.branch, 'develop')
      assert.equal(sh(worktree.path, 'rev-parse', '--show-toplevel'), sh(repo, 'rev-parse', '--show-toplevel'))
      writeFileSync(join(worktree.path, 'app.ts'), 'two\n')
      assert.equal((await keepStatus(repo, worktree)).unsaved, 1)
      assert.deepEqual(await keepChanges(repo, worktree), { ok: true, kept: 1 })
      assert.equal(sh(repo, 'log', '-1', '--format=%s'), 'Changes from the builder')
      assert.deepEqual(sh(repo, 'branch', '--format=%(refname:short)').split('\n'), ['develop'])
    } finally {
      delete process.env.PIKKU_STUDIO_IN_PLACE
    }
  })
})
