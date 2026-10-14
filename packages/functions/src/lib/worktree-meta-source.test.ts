import { test, expect } from 'bun:test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { worktreeMetaSource } from './worktree-meta-source.js'

const withMeta = async (meta: unknown) => {
  const dir = await mkdtemp(join(tmpdir(), 'wt-meta-'))
  await mkdir(join(dir, '.pikku', 'function'), { recursive: true })
  await writeFile(join(dir, '.pikku', 'function', 'pikku-functions-meta-verbose.gen.json'), JSON.stringify(meta))
  return dir
}

test('reads the verbose meta of the project worktree', async () => {
  const dir = await withMeta({ hello: { pikkuFuncId: 'hello' } })
  const source = worktreeMetaSource(async () => dir)
  expect(await source.read({ projectId: 'p1', gitSha: null })).toEqual({ hello: { pikkuFuncId: 'hello' } } as never)
})

test('returns null when the worktree has no generated meta', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'wt-empty-'))
  expect(await worktreeMetaSource(async () => dir).read({ projectId: 'p1', gitSha: null })).toBeNull()
})

test('returns null for an unknown project or no project', async () => {
  const unknown = worktreeMetaSource(async () => {
    throw new Error('no such project')
  })
  expect(await unknown.read({ projectId: 'nope', gitSha: null })).toBeNull()
  expect(await unknown.read({ projectId: null, gitSha: null })).toBeNull()
})
