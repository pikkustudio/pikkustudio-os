import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, test } from 'node:test'
import { addWorktree, commitPaths, createLayout } from '../../src/services/worktree.js'
import { resolveWt } from '../../src/services/worktree-sweep.js'

const layout = async () => {
  const base = mkdtempSync(join(tmpdir(), 'seed-'))
  const home = join(base, 'home')
  mkdirSync(home)
  const root = join(base, 'p1')
  const scaffold = join(root, '.scaffold', 'app')
  mkdirSync(scaffold, { recursive: true })
  writeFileSync(join(scaffold, 'a.txt'), 'one\n')
  writeFileSync(join(scaffold, '.gitignore'), 'node_modules\n.env\n')
  writeFileSync(join(scaffold, '.worktreeinclude'), 'node_modules/\n')
  await commitPaths(scaffold, ['.'], 'Start')
  await createLayout(root, scaffold, home)
  mkdirSync(join(root, 'develop', 'node_modules', 'dep'), { recursive: true })
  writeFileSync(join(root, 'develop', 'node_modules', 'dep', 'index.js'), 'ok\n')
  writeFileSync(join(root, 'develop', '.env'), 'SECRET=1\n')
  return { base, home, root }
}

const saved = process.env.PIKKU_STUDIO_WT
afterEach(() => {
  if (saved === undefined) delete process.env.PIKKU_STUDIO_WT
  else process.env.PIKKU_STUDIO_WT = saved
})

describe('seeding a new session worktree', () => {
  test('succeeds without wt, leaving a plain worktree', async () => {
    const { base, home, root } = await layout()
    process.env.PIKKU_STUDIO_WT = join(base, 'nowhere', 'wt')
    await addWorktree(root, 's-aaaa', home)
    assert.ok(existsSync(join(root, 's-aaaa', 'a.txt')))
    assert.equal(existsSync(join(root, 's-aaaa', 'node_modules')), false)
  })

  test('a failing wt never throws', async () => {
    const { base, home, root } = await layout()
    const fake = join(base, 'wt')
    writeFileSync(fake, '#!/bin/sh\necho boom >&2\nexit 3\n')
    chmodSync(fake, 0o755)
    process.env.PIKKU_STUDIO_WT = fake
    await addWorktree(root, 's-bbbb', home)
    assert.ok(existsSync(join(root, 's-bbbb', 'a.txt')))
  })

  test('calls wt with the empty config and the include requirement', async () => {
    const { base, home, root } = await layout()
    const fake = join(base, 'wt')
    const log = join(base, 'wt.log')
    writeFileSync(fake, `#!/bin/sh\necho "$@" >> "${log}"\n`)
    chmodSync(fake, 0o755)
    process.env.PIKKU_STUDIO_WT = fake
    await addWorktree(root, 's-cccc', home)
    const line = readFileSync(log, 'utf8')
    assert.match(line, /step copy-ignored --from develop --require-include -y/)
    assert.match(line, new RegExp(`--config ${join(home, 'worktrunk-empty.toml')}`))
    assert.equal(readFileSync(join(home, 'worktrunk-empty.toml'), 'utf8'), '')
  })

  test('without a home nothing is seeded', async () => {
    const { base, root } = await layout()
    const fake = join(base, 'wt')
    const log = join(base, 'wt.log')
    writeFileSync(fake, `#!/bin/sh\necho x >> "${log}"\n`)
    chmodSync(fake, 0o755)
    process.env.PIKKU_STUDIO_WT = fake
    await addWorktree(root, 's-dddd')
    assert.equal(existsSync(log), false)
  })

  test('with the real wt a session gets node_modules and no .env', { skip: resolveWt() ? false : 'wt is not installed' }, async () => {
    const { home, root } = await layout()
    delete process.env.PIKKU_STUDIO_WT
    await addWorktree(root, 's-eeee', home)
    assert.equal(readFileSync(join(root, 's-eeee', 'node_modules', 'dep', 'index.js'), 'utf8'), 'ok\n')
    assert.equal(existsSync(join(root, 's-eeee', '.env')), false)
    assert.equal(execFileSync('git', ['status', '--porcelain'], { cwd: join(root, 's-eeee') }).toString(), '')
  })
})
