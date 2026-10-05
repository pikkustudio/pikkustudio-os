import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { LFS_TEXT_LIMIT, trackLargeFiles } from '../../src/services/lfs.js'

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8' })

const repo = () => {
  const dir = mkdtempSync(join(tmpdir(), 'lfs-'))
  git(dir, 'init', '-q', '-b', 'main')
  git(dir, 'config', 'user.email', 't@t.t')
  git(dir, 'config', 'user.name', 't')
  return dir
}

test('non-text files and big text files go to LFS, small text stays', async () => {
  const dir = repo()
  mkdirSync(join(dir, 'src'))
  writeFileSync(join(dir, 'logo.png'), Buffer.from([137, 80, 78, 71, 0, 1, 2]))
  writeFileSync(join(dir, 'blob'), Buffer.from([1, 0, 2, 0, 3]))
  writeFileSync(join(dir, 'data dump.json'), 'x'.repeat(LFS_TEXT_LIMIT + 10))
  writeFileSync(join(dir, 'src', 'app.ts'), 'export const a = 1\n')
  writeFileSync(join(dir, 'notes.txt'), 'small\n')

  const patterns = await trackLargeFiles(dir)
  assert.deepEqual([...patterns].sort(), ['*.png', 'blob', 'data[[:space:]]dump.json'])

  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'save')
  const stored = git(dir, 'lfs', 'ls-files', '--name-only').split('\n').filter(Boolean).sort()
  assert.deepEqual(stored, ['blob', 'data dump.json', 'logo.png'])
  assert.match(readFileSync(join(dir, '.gitattributes'), 'utf8'), /\*\.png filter=lfs/)
})

test('files already tracked are left alone and a clean repo changes nothing', async () => {
  const dir = repo()
  writeFileSync(join(dir, 'a.png'), Buffer.from([0, 1, 2]))
  assert.deepEqual(await trackLargeFiles(dir), ['*.png'])
  git(dir, 'add', '-A')
  git(dir, 'commit', '-q', '-m', 'one')
  writeFileSync(join(dir, 'b.png'), Buffer.from([0, 9, 9]))
  assert.deepEqual(await trackLargeFiles(dir), [])
  assert.deepEqual(await trackLargeFiles(repo()), [])
})
