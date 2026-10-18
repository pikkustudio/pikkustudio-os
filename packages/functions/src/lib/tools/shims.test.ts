import { describe, expect, test } from 'bun:test'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tempDir } from './fixtures.js'
import type { Manifest, ToolEntry } from './manifest.js'
import { ToolResolver } from './resolver.js'

const script = (path: string, body: string) => {
  mkdirSync(join(path, '..'), { recursive: true })
  writeFileSync(path, `#!/bin/sh\n${body}\n`)
  chmodSync(path, 0o755)
}

const entry = (id: string, bin: string, env: Record<string, string>, requires?: string[]): ToolEntry => ({
  id,
  name: id,
  find: { command: [bin, '-v'], version: `${id} (\\S+)` },
  requires,
  versions: [{ version: '1.0', default: true, artifacts: { 'linux-x64': { format: 'zip', bin: [`${id}/bin/${bin}`], url: 'http://127.0.0.1:1/x.zip', sha256: 'a'.repeat(64), root: id } } }],
  env,
  get: {},
})

const manifest: Manifest = {
  tools: [
    entry('jdk', 'java', { JAVA_HOME: '${root}' }),
    entry('ghidra', 'ghidra-run', { GHIDRA_INSTALL_DIR: '${root}' }, ['jdk']),
    entry('shady', 'ls', {}),
  ],
}

const fakeInstall = (home: string, id: string, bin: string, body: string) => {
  const dir = join(home, 'tools', id, '1.0')
  script(join(dir, id, 'bin', bin), body)
  writeFileSync(join(dir, 'installed.json'), JSON.stringify({ sha256: 'a'.repeat(64), url: 'u', installedAt: 'now' }))
  return dir
}

const setup = (coreBin: string[] = []) => {
  const home = tempDir()
  const shims = join(home, 'bin')
  const tools = new ToolResolver({ home, manifest, platform: 'linux-x64', searchPath: '', env: {}, coreBin, shimsDirs: [shims] })
  return { home, shims, tools }
}

describe('tool shims', () => {
  test('a shim and env.sh appear after sync and merge dependency env', async () => {
    const { home, shims, tools } = setup()
    const jdk = fakeInstall(home, 'jdk', 'java', 'echo java')
    const ghidra = fakeInstall(home, 'ghidra', 'ghidra-run', 'echo "$JAVA_HOME|$GHIDRA_INSTALL_DIR"')
    await tools.syncShims()
    const env = readFileSync(join(home, 'tools', 'env.sh'), 'utf8')
    expect(env).toContain(`export JAVA_HOME='${join(jdk, 'jdk')}'`)
    expect(env).toContain(`export GHIDRA_INSTALL_DIR='${join(ghidra, 'ghidra')}'`)
    expect(env).toContain(join(ghidra, 'ghidra', 'bin'))
    expect(existsSync(join(shims, 'java'))).toBe(true)
    expect(existsSync(join(shims, 'ghidra-run'))).toBe(true)
  })

  test('the shim execs the real binary with the tool env and no PATH change', async () => {
    const { home, shims, tools } = setup()
    const jdk = fakeInstall(home, 'jdk', 'java', 'echo java')
    const ghidra = fakeInstall(home, 'ghidra', 'ghidra-run', 'echo "$JAVA_HOME|$GHIDRA_INSTALL_DIR|$*"')
    await tools.syncShims()
    const out = Bun.spawnSync([join(shims, 'ghidra-run'), 'a b', "it's"], { env: { PATH: '/usr/bin:/bin' } })
    expect(out.stdout.toString().trim()).toBe(`${join(jdk, 'jdk')}|${join(ghidra, 'ghidra')}|a b it's`)
  })

  test('core command names, existing files and the pikku shim are never overwritten', async () => {
    const core = tempDir()
    script(join(core, 'ls'), 'echo core')
    const { home, shims, tools } = setup([core])
    fakeInstall(home, 'jdk', 'java', 'echo java')
    fakeInstall(home, 'shady', 'ls', 'echo shady')
    script(join(shims, 'java'), 'echo mine')
    script(join(shims, 'pikku'), 'echo pikku')
    await tools.syncShims()
    expect(existsSync(join(shims, 'ls'))).toBe(false)
    expect(readFileSync(join(shims, 'java'), 'utf8')).toContain('echo mine')
    expect(readFileSync(join(shims, 'pikku'), 'utf8')).toContain('echo pikku')
  })

  test('sync is idempotent and removing a version deletes its shims', async () => {
    const { home, shims, tools } = setup()
    fakeInstall(home, 'jdk', 'java', 'echo java')
    await tools.syncShims()
    const first = readFileSync(join(shims, 'java'), 'utf8')
    await tools.syncShims()
    expect(readFileSync(join(shims, 'java'), 'utf8')).toBe(first)
    await tools.remove('jdk', '1.0')
    expect(existsSync(join(shims, 'java'))).toBe(false)
    expect(readFileSync(join(home, 'tools', 'env.sh'), 'utf8')).not.toContain('JAVA_HOME')
  })
})
