import assert from 'node:assert'
import { mkdir, mkdtemp, readlink, writeFile, lstat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, test } from 'node:test'
import { linkDevPikku } from '../../src/services/dev-link.js'

const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'pikku-dev-link-'))
  const dev = join(root, 'dev')
  const project = join(root, 'project')
  for (const name of ['cli', 'core']) await mkdir(join(dev, 'packages', name), { recursive: true })
  for (const name of ['cli', 'core', 'react']) {
    await mkdir(join(project, 'node_modules', '@pikku', name), { recursive: true })
    await writeFile(join(project, 'node_modules', '@pikku', name, 'package.json'), '{}')
  }
  return { dev, project }
}

describe('linkDevPikku', () => {
  test('does nothing without a dev root', async () => {
    const { project } = await fixture()
    assert.deepEqual(await linkDevPikku(project, undefined), [])
    assert.equal((await lstat(join(project, 'node_modules', '@pikku', 'cli'))).isSymbolicLink(), false)
  })

  test('links cli and core, keeps the originals, leaves the rest alone', async () => {
    const { dev, project } = await fixture()
    assert.deepEqual(await linkDevPikku(project, dev), ['cli', 'core'])
    assert.equal(await readlink(join(project, 'node_modules', '@pikku', 'cli')), join(dev, 'packages', 'cli'))
    assert.equal(await readlink(join(project, 'node_modules', '@pikku', 'core')), join(dev, 'packages', 'core'))
    assert.equal((await lstat(join(project, 'node_modules', '.orig-pikku', 'cli', 'package.json'))).isFile(), true)
    assert.equal((await lstat(join(project, 'node_modules', '@pikku', 'react'))).isDirectory(), true)
  })

  test('is idempotent and relinks after an install puts the registry copy back', async () => {
    const { dev, project } = await fixture()
    await linkDevPikku(project, dev)
    assert.deepEqual(await linkDevPikku(project, dev), [])
    const link = join(project, 'node_modules', '@pikku', 'cli')
    const { rm, mkdir: mk, writeFile: wf } = await import('node:fs/promises')
    await rm(link, { force: true })
    await mk(link, { recursive: true })
    await wf(join(link, 'package.json'), '{}')
    assert.deepEqual(await linkDevPikku(project, dev), ['cli'])
    assert.equal(await readlink(link), join(dev, 'packages', 'cli'))
  })

  test('skips a project with no install', async () => {
    const { dev } = await fixture()
    const empty = await mkdtemp(join(tmpdir(), 'pikku-dev-link-empty-'))
    assert.deepEqual(await linkDevPikku(empty, dev), [])
  })
})
