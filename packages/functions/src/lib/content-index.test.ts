import { describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { listContentFolder, recordContentAuthor } from './content-index.js'

const setup = async () => {
  const root = await mkdtemp(join(tmpdir(), 'content-'))
  await mkdir(join(root, 'private', 'docs', 'reports'), { recursive: true })
  await writeFile(join(root, 'private', 'docs', 'a.txt'), 'hello')
  await writeFile(join(root, 'private', 'docs', 'b.png'), 'x'.repeat(2000))
  await writeFile(join(root, 'private', 'docs', 'reports', 'q1.pdf'), 'y'.repeat(500))
  return { content: { config: { localFileUploadPath: root } }, root }
}

describe('listContentFolder', () => {
  test('root shows folders with totals', async () => {
    const { content } = await setup()
    const root = await listContentFolder(content, 'private', '', 200, undefined)
    expect(root.folders).toEqual([expect.objectContaining({ name: 'docs', fileCount: 3, totalBytes: 2505 })])
    expect(root.files).toEqual([])
  })

  test('one level, with authors and paging', async () => {
    const { content } = await setup()
    await recordContentAuthor(content, 'private', 'docs', 'a.txt', 'u1')
    const first = await listContentFolder(content, 'private', 'docs', 1, undefined)
    expect(first.folders.map((f) => f.name)).toEqual(['reports'])
    expect(first.files.map((f) => f.name)).toEqual(['a.txt'])
    expect(first.files[0]!.author?.by).toBe('u1')
    expect(first.nextCursor).toBe('a.txt')
    const second = await listContentFolder(content, 'private', 'docs', 1, first.nextCursor!)
    expect(second.files.map((f) => f.name)).toEqual(['b.png'])
    expect(second.files[0]!.author).toBeNull()
    expect(second.nextCursor).toBeNull()
  })

  test('overwrite keeps the creator', async () => {
    const { content } = await setup()
    await recordContentAuthor(content, 'private', 'docs', 'a.txt', 'u1')
    await recordContentAuthor(content, 'private', 'docs', 'a.txt', 'u2')
    const page = await listContentFolder(content, 'private', 'docs', 10, undefined)
    expect(page.files[0]!.author).toEqual(expect.objectContaining({ by: 'u1', updatedBy: 'u2' }))
  })

  test('never escapes the content folder', async () => {
    const { content } = await setup()
    const page = await listContentFolder(content, 'private', '../../..', 10, undefined)
    expect(page.folders.map((f) => f.name)).toEqual(['docs'])
  })

  test('unsupported without a local folder', async () => {
    expect((await listContentFolder({}, 'private', '', 10, undefined)).supported).toBe(false)
  })
})
