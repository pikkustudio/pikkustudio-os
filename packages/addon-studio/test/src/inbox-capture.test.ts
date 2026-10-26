import assert from 'node:assert'
import { lstatSync, readFileSync, readlinkSync, realpathSync } from 'node:fs'
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, test } from 'node:test'
import { injectInboxCapture } from '../../src/services/inbox-capture.js'

describe('injectInboxCapture', () => {
  let root: string
  let project: string
  let capture: string
  let runtimeDir: string

  beforeEach(async () => {
    root = realpathSync(await mkdtemp(join(tmpdir(), 'inbox-capture-')))
    project = join(root, 'project')
    capture = join(root, 'addon-inbox')
    runtimeDir = join(project, '.pikku-runtime', 'studio')
    await mkdir(project, { recursive: true })
    await mkdir(capture, { recursive: true })
    await writeFile(join(project, 'pikku.config.json'), JSON.stringify({ srcDirectories: ['src'] }))
  })

  afterEach(() => rm(root, { recursive: true, force: true }))

  const inject = () => injectInboxCapture({ projectDir: project, runtimeDir, inboxPackageDir: capture })

  test('links the package into the project, wires only the inbox contributor, and overlays the config', async () => {
    const injected = await inject()
    assert.ok(injected)
    assert.equal(injected.packageDir, capture)
    assert.equal(readlinkSync(join(project, 'node_modules', '@pikkustudio', 'addon-inbox')), capture)

    const wiring = readFileSync(join(runtimeDir, 'inbox-capture', 'inbox-capture.wiring.ts'), 'utf8')
    assert.match(wiring, /from '@pikku\/core\/addon'/)
    assert.match(wiring, /package: '@pikkustudio\/addon-inbox'/)
    assert.match(wiring, /contributors: \['inbox'\]/)

    assert.equal(injected.overlay, join(runtimeDir, 'inbox-capture.pikku.config.json'))
    assert.deepEqual(JSON.parse(readFileSync(injected.overlay, 'utf8')), {
      extends: '../../pikku.config.json',
      srcDirectories: ['./inbox-capture'],
    })
  })

  test('is idempotent, and repoints a link that names another directory', async () => {
    const first = await inject()
    assert.deepEqual(await inject(), first)
    const target = join(project, 'node_modules', '@pikkustudio', 'addon-inbox')

    const moved = join(root, 'moved')
    await mkdir(moved)
    await rm(target)
    await symlink(moved, target, 'dir')
    await inject()
    assert.equal(readlinkSync(target), capture)
  })

  test('leaves an installed copy of the package alone', async () => {
    const target = join(project, 'node_modules', '@pikkustudio', 'addon-inbox')
    await mkdir(target, { recursive: true })
    assert.ok(await inject())
    assert.equal(lstatSync(target).isSymbolicLink(), false)
  })

  test('does nothing for a project with no pikku config', async () => {
    await rm(join(project, 'pikku.config.json'))
    assert.equal(await inject(), undefined)
    assert.throws(() => lstatSync(join(project, 'node_modules')))
  })

  test('does nothing when the project declares the package itself', async () => {
    await writeFile(
      join(project, 'package.json'),
      JSON.stringify({ devDependencies: { '@pikkustudio/addon-inbox': '*' } }),
    )
    assert.equal(await inject(), undefined)
    assert.throws(() => lstatSync(join(project, '.pikku-runtime')))
  })
})
