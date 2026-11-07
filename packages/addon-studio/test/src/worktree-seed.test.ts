import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, mock, test } from 'node:test'
import { addWorktree, canReflink, commitPaths, createLayout, gitSupportsWorktrunk, resetSeedCaches } from '../../src/services/worktree.js'
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
  writeFileSync(join(scaffold, '.worktreeinclude'), 'node_modules/\ndist/\n')
  writeFileSync(join(scaffold, 'bun.lock'), '{}\n')
  await commitPaths(scaffold, ['.'], 'Start')
  await createLayout(root, scaffold, home)
  mkdirSync(join(root, 'develop', 'node_modules', 'dep'), { recursive: true })
  writeFileSync(join(root, 'develop', 'node_modules', 'dep', 'index.js'), 'ok\n')
  writeFileSync(join(root, 'develop', '.env'), 'SECRET=1\n')
  return { base, home, root }
}

const KEYS = ['PIKKU_STUDIO_WT', 'PIKKU_STUDIO_SEED_TIMEOUT_MS', 'PATH'] as const
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]))
afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k]
    else process.env[k] = saved[k]
  }
  resetSeedCaches()
  mock.restoreAll()
})

const script = (file: string, body: string) => {
  writeFileSync(file, `#!/bin/sh\n${body}\n`)
  chmodSync(file, 0o755)
  return file
}

/** A directory put first on PATH holding fake tools. */
const fakeBin = (base: string, tools: Record<string, string>) => {
  const dir = join(base, 'bin')
  mkdirSync(dir, { recursive: true })
  for (const [name, body] of Object.entries(tools)) script(join(dir, name), body)
  process.env.PATH = `${dir}:${saved.PATH}`
  return dir
}

const alive = (pid: number) => {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

const warnings = () => mock.method(console, 'warn', () => undefined)

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

  test('a hung wt that forked a helper leaves no survivor after the timeout', async () => {
    const { base, home, root } = await layout()
    const pids = join(base, 'pids')
    process.env.PIKKU_STUDIO_WT = script(join(base, 'wt'), `sleep 601 &\necho $! > "${pids}"\necho $$ >> "${pids}"\nsleep 601`)
    process.env.PIKKU_STUDIO_SEED_TIMEOUT_MS = '700'
    const warn = warnings()
    await addWorktree(root, 's-ffff', home)
    const [child, parent] = readFileSync(pids, 'utf8').trim().split('\n').map(Number)
    for (let i = 0; i < 30 && (alive(child!) || alive(parent!)); i++) await new Promise((r) => setTimeout(r, 100))
    assert.equal(alive(child!), false, 'the forked helper is gone')
    assert.equal(alive(parent!), false, 'the wt itself is gone')
    assert.match(String(warn.mock.calls.at(-1)!.arguments[0]), /timed out/)
    assert.ok(existsSync(join(root, 's-ffff', 'a.txt')))
  })

  test('the warning carries what wt printed on stderr', async () => {
    const { base, home, root } = await layout()
    process.env.PIKKU_STUDIO_WT = script(join(base, 'wt'), 'echo "" >&2\necho "Git 2.39.5 is unsupported; need 2.43" >&2\necho more >&2\nexit 1')
    const warn = warnings()
    await addWorktree(root, 's-gggg', home)
    const text = warn.mock.calls.map((c) => String(c.arguments[0])).join('\n')
    assert.match(text, /s-gggg/)
    assert.match(text, /exited 1: Git 2\.39\.5 is unsupported; need 2\.43 \| more/)
  })

  test('git older than 2.43 skips wt with a clear warning', async () => {
    const { base, home, root } = await layout()
    const realGit = execFileSync('which', ['git']).toString().trim()
    fakeBin(base, { git: `if [ "$1" = "--version" ]; then echo "git version 2.39.5"; else exec "${realGit}" "$@"; fi` })
    const log = join(base, 'wt.log')
    process.env.PIKKU_STUDIO_WT = script(join(base, 'wt'), `echo x >> "${log}"`)
    const warn = warnings()
    assert.deepEqual(await gitSupportsWorktrunk(), { ok: false, version: '2.39.5' })
    await addWorktree(root, 's-hhhh', home)
    assert.equal(existsSync(log), false)
    assert.match(String(warn.mock.calls.at(-1)!.arguments[0]), /worktrunk needs git 2\.43\+ \(found 2\.39\.5\)/)
    assert.ok(existsSync(join(root, 's-hhhh', 'a.txt')))
  })

  test('the reflink probe decides per volume and is asked once', async () => {
    const { base, root } = await layout()
    const log = join(base, 'cp.log')
    fakeBin(base, { cp: `echo "$@" >> "${log}"\nexit 0` })
    assert.equal(await canReflink(root), true)
    assert.equal(await canReflink(join(root, 'develop')), true)
    assert.equal(readFileSync(log, 'utf8').trim().split('\n').length, 1)
    assert.match(readFileSync(log, 'utf8'), process.platform === 'darwin' ? /^-c / : /^--reflink=always /)
    resetSeedCaches()
    fakeBin(base, { cp: 'exit 1' })
    assert.equal(await canReflink(root), false)
    assert.equal(readdirProbe(root), 0, 'no probe files are left behind')
  })

  test('without reflink, build output is copied and node_modules comes from a frozen install', async () => {
    const { base, home, root } = await layout()
    mkdirSync(join(root, 'develop', 'dist'))
    writeFileSync(join(root, 'develop', 'dist', 'out.js'), 'built\n')
    const wtLog = join(base, 'wt.log')
    const bunLog = join(base, 'bun.log')
    fakeBin(base, { cp: 'exit 1', bun: `echo "$PWD $@" >> "${bunLog}"` })
    process.env.PIKKU_STUDIO_WT = script(
      join(base, 'wt2'),
      `echo "$@" >> "${wtLog}"\ncase "$*" in *--dry-run*) echo '{"entries":[{"path":"node_modules","kind":"dir"},{"path":"dist","kind":"dir"},{"path":"../evil","kind":"dir"}]}';; esac`
    )
    await addWorktree(root, 's-iiii', home)
    const path = join(root, 's-iiii')
    assert.equal(readFileSync(join(path, 'dist', 'out.js'), 'utf8'), 'built\n')
    assert.equal(existsSync(join(path, 'node_modules')), false, 'node_modules is not copied')
    assert.equal(existsSync(join(root, 'evil')), false)
    assert.equal(readFileSync(wtLog, 'utf8').trim().split('\n').length, 1, 'wt only planned, it did not copy')
    assert.match(readFileSync(bunLog, 'utf8'), new RegExp(`${path.replace(/^\/private/, '(?:/private)?')} install --frozen-lockfile --backend=hardlink`))
  })

  test('without reflink, a failing install keeps the plain worktree and says why', async () => {
    const { base, home, root } = await layout()
    fakeBin(base, { cp: 'exit 1', bun: 'echo "frozen lockfile had changes" >&2\nexit 1' })
    process.env.PIKKU_STUDIO_WT = script(join(base, 'wt'), 'echo \'{"entries":[{"path":"node_modules","kind":"dir"}]}\'')
    const warn = warnings()
    await addWorktree(root, 's-jjjj', home)
    assert.match(String(warn.mock.calls.at(-1)!.arguments[0]), /could not install dependencies.*bun exited 1: frozen lockfile had changes/)
    assert.ok(existsSync(join(root, 's-jjjj', 'a.txt')))
  })

  test('without reflink, a project that lists no node_modules installs nothing', async () => {
    const { base, home, root } = await layout()
    const bunLog = join(base, 'bun.log')
    fakeBin(base, { cp: 'exit 1', bun: `echo x >> "${bunLog}"` })
    process.env.PIKKU_STUDIO_WT = script(join(base, 'wt'), 'echo \'{"entries":[]}\'')
    await addWorktree(root, 's-kkkk', home)
    assert.equal(existsSync(bunLog), false)
  })

  test('with reflink, install runs only when the lockfile differs from develop', async () => {
    const { base, home, root } = await layout()
    const bunLog = join(base, 'bun.log')
    fakeBin(base, { cp: 'exit 0', bun: `echo "$@" >> "${bunLog}"` })
    process.env.PIKKU_STUDIO_WT = script(join(base, 'wt'), 'exit 0')
    await addWorktree(root, 's-llll', home)
    assert.equal(existsSync(bunLog), false, 'same lockfile: the clone is used as is')
    writeFileSync(join(root, 'develop', 'bun.lock'), '{"changed":true}\n')
    await addWorktree(root, 's-mmmm', home)
    assert.equal(readFileSync(bunLog, 'utf8').trim(), 'install --frozen-lockfile')
  })
})

const readdirProbe = (dir: string) => readdirSync(dir).filter((f) => f.startsWith('.reflink-probe')).length
