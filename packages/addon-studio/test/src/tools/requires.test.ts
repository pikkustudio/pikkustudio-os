import { afterEach, describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { delimiter, dirname, join } from 'node:path'
import { makeTarGz, makeZip, serveFiles, sha256, tempDir } from './fixtures.js'
import { bakedManifest, type Manifest, type ToolEntry } from '../../../src/lib/tools/manifest.js'
import { ToolResolver } from '../../../src/lib/tools/resolver.js'

let server: ReturnType<typeof serveFiles>

afterEach(() => server?.stop())

const script = (path: string, body: string) => {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, `#!/bin/sh\n${body}\n`)
  chmodSync(path, 0o755)
}

const baseArchive = makeTarGz([{ name: 'b/bin/base', data: '#!/bin/sh\necho "base 2.1"\n' }])
const appArchive = makeZip([{ name: 'app/bin/app', data: '#!/bin/sh\necho "app 1.0"\n' }])

const base = (artifact?: { url: string; sha256: string }): ToolEntry => ({
  id: 'base',
  name: 'Base runtime',
  find: { command: ['base', '-v'], version: 'base (\\d+\\.\\d+)', roots: ['$BASE_HOME'], bin: ['bin/base'] },
  versions: [
    { version: '2.1', default: true, artifacts: artifact ? { 'linux-x64': { format: 'tar.gz', bin: ['b/bin/base'], root: 'b', ...artifact } } : {} },
  ],
  env: { BASE_HOME: '${root}' },
  get: { brew: 'brew install base' },
})

const app = (artifact?: { url: string; sha256: string }): ToolEntry => ({
  id: 'app',
  name: 'App',
  find: { command: ['app', '--version'], version: 'app (\\S+)' },
  requires: ['base@>=2'],
  versions: [
    { version: '1.0', default: true, artifacts: artifact ? { 'linux-x64': { format: 'zip', bin: ['app/bin/app'], ...artifact } } : {} },
  ],
  env: { APP: '${bin}' },
  get: { link: 'https://example.com/app' },
})

const resolver = (manifest: Manifest, options: { home?: string; searchPath?: string; env?: Record<string, string>; autoInstall?: string[] } = {}) =>
  new ToolResolver({ home: options.home ?? tempDir(), manifest, platform: 'linux-x64', searchPath: options.searchPath ?? '', env: options.env ?? {}, autoInstall: options.autoInstall })

describe('requires', () => {
  test('a missing dependency answers needs naming it and who asked', async () => {
    const bin = tempDir()
    script(join(bin, 'app'), 'echo "app 1.0"')
    const result = await resolver({ tools: [base(), app()] }, { searchPath: bin }).resolve({ tool: 'app', requestedBy: 'checkPage' })
    expect(result).toMatchObject({
      status: 'needs',
      tool: 'base',
      name: 'Base runtime',
      requestedBy: 'app',
      version: '2.1',
      canInstall: false,
      get: { brew: 'brew install base' },
    })
  })

  test('a dependency outside the required range is missing', async () => {
    const root = tempDir()
    script(join(root, 'bin', 'base'), 'echo "base 1.9"')
    const bin = tempDir()
    script(join(bin, 'app'), 'echo "app 1.0"')
    const result = await resolver({ tools: [base(), app()] }, { searchPath: bin, env: { BASE_HOME: root } }).resolve({ tool: 'app', requestedBy: 'test' })
    expect(result).toMatchObject({ status: 'needs', tool: 'base', requestedBy: 'app' })
  })

  test('merges the dependency env and bins into the dependent', async () => {
    const root = tempDir()
    script(join(root, 'bin', 'base'), 'echo "base 2.1"')
    const bin = tempDir()
    script(join(bin, 'app'), 'echo "app 1.0"')
    const tools = resolver({ tools: [base(), app()] }, { searchPath: bin, env: { BASE_HOME: root } })
    const result = await tools.resolve({ tool: 'app', requestedBy: 'test' })
    expect(result).toMatchObject({
      status: 'found',
      bins: [join(bin, 'app'), join(root, 'bin', 'base')],
      env: { APP: join(bin, 'app'), BASE_HOME: root },
    })
    const { env, needs } = await tools.childEnv([{ tool: 'app', requestedBy: 'test' }])
    expect(needs).toEqual([])
    expect(env.PATH!.split(delimiter).slice(0, 2)).toEqual([bin, join(root, 'bin')])
  })

  test('a cycle throws', async () => {
    const a: ToolEntry = { ...base(), id: 'a', requires: ['b'] }
    const b: ToolEntry = { ...base(), id: 'b', requires: ['a'] }
    const tools = resolver({ tools: [a, b] })
    await expect(tools.resolve({ tool: 'a', requestedBy: 'test' })).rejects.toThrow('Tool dependency cycle: a -> b -> a')
    await expect(tools.install('a')).rejects.toThrow('Tool dependency cycle')
  })

  test('status lists what a tool requires and whether it is met', async () => {
    const root = tempDir()
    script(join(root, 'bin', 'base'), 'echo "base 2.1"')
    const unmet = await resolver({ tools: [base(), app()] }).list()
    expect(unmet.find((tool) => tool.id === 'app')).toMatchObject({
      status: 'unavailable',
      requires: [{ tool: 'base', name: 'Base runtime', version: '>=2', met: false }],
    })
    expect(unmet.find((tool) => tool.id === 'base')?.requires).toEqual([])
    const met = await resolver({ tools: [base(), app()] }, { env: { BASE_HOME: root } }).list()
    expect(met.find((tool) => tool.id === 'app')?.requires[0]).toMatchObject({ met: true })
  })
})

describe('installing requirements', () => {
  const served = () => {
    server = serveFiles({ '/base.tar.gz': baseArchive, '/app.zip': appArchive })
    return {
      base: { url: server.url('/base.tar.gz'), sha256: sha256(baseArchive) },
      app: { url: server.url('/app.zip'), sha256: sha256(appArchive) },
    }
  }

  test('install puts the requirements in first', async () => {
    const files = served()
    const home = tempDir()
    const tools = resolver({ tools: [base(files.base), app(files.app)] }, { home })
    await tools.install('app')
    expect((await tools.resolve({ tool: 'base', requestedBy: 'test' })).status).toBe('installed')
    const result = await tools.resolve({ tool: 'app', requestedBy: 'test' })
    expect(result).toMatchObject({ status: 'installed', env: { BASE_HOME: join(home, 'tools', 'base', '2.1', 'b') } })
  })

  test('install refuses when a requirement cannot be installed', async () => {
    const files = served()
    const tools = resolver({ tools: [base(), app(files.app)] })
    await expect(tools.install('app')).rejects.toThrow('Base runtime is required by App')
  })

  test('ensure installs a requirement only when it is on the allow-list', async () => {
    const files = served()
    const manifest = { tools: [base(files.base), app(files.app)] }
    const blocked = await resolver(manifest, { autoInstall: ['app'] }).ensure([{ tool: 'app', requestedBy: 'checkPage' }])
    expect(blocked[0]).toMatchObject({ status: 'needs', tool: 'base', requestedBy: 'app', canInstall: true })
    const allowed = await resolver(manifest, { autoInstall: ['app', 'base'] }).ensure([{ tool: 'app', requestedBy: 'checkPage' }])
    expect(allowed[0]).toMatchObject({ status: 'installed', tool: 'app' })
  })
})

describe('jdk and ghidra manifest entries', () => {
  const isolated: Manifest = {
    tools: bakedManifest.tools.map((tool) => ({ ...tool, find: { ...tool.find, roots: tool.find.roots?.filter((root) => !root.startsWith('/')) } })),
  }

  const fakeJdk = (version: string, javac = true) => {
    const root = tempDir()
    script(join(root, 'bin', 'java'), `echo 'openjdk version "${version}" 2026-08-18' >&2`)
    if (javac) script(join(root, 'bin', 'javac'), 'echo javac')
    return root
  }

  const fakeGhidra = (os: string) => {
    const root = tempDir()
    mkdirSync(join(root, 'Ghidra', 'Features', 'Decompiler', 'os', os), { recursive: true })
    writeFileSync(join(root, 'Ghidra', 'application.properties'), 'application.name=Ghidra\napplication.version=12.1.4\n')
    writeFileSync(join(root, 'Ghidra', 'Features', 'Decompiler', 'os', os, 'decompile'), '')
    script(join(root, 'support', 'analyzeHeadless'), 'true')
    script(join(root, 'ghidraRun'), 'true')
    return root
  }

  const on = (platform: 'darwin-arm64' | 'linux-x64' | 'linux-arm64', env: Record<string, string>) =>
    new ToolResolver({ home: tempDir(), manifest: isolated, platform, searchPath: '', env })

  test('every dependency in the baked manifest exists', () => {
    const ids = new Set(bakedManifest.tools.map((tool) => tool.id))
    for (const tool of bakedManifest.tools) for (const requirement of tool.requires ?? []) expect(ids).toContain(requirement.split('@')[0]!)
  })

  test('finds a full JDK of version 21 or later through JAVA_HOME and sets it', async () => {
    const root = fakeJdk('21.0.4')
    const result = await on('darwin-arm64', { JAVA_HOME: root }).resolve({ tool: 'jdk', version: '>=21', requestedBy: 'test' })
    expect(result).toMatchObject({ status: 'found', version: '21.0.4', env: { JAVA_HOME: root }, bins: [join(root, 'bin', 'java'), join(root, 'bin', 'javac')] })
  })

  test('a JRE without javac or a JDK older than 21 is not accepted', async () => {
    expect((await on('darwin-arm64', { JAVA_HOME: fakeJdk('21.0.4', false) }).resolve({ tool: 'jdk', version: '>=21', requestedBy: 'test' })).status).toBe('needs')
    expect((await on('darwin-arm64', { JAVA_HOME: fakeJdk('17.0.9') }).resolve({ tool: 'jdk', version: '>=21', requestedBy: 'test' })).status).toBe('needs')
  })

  test('ghidra on macOS is found with its JDK merged in', async () => {
    const jdk = fakeJdk('21.0.4')
    const ghidra = fakeGhidra('mac_arm_64')
    const result = await on('darwin-arm64', { JAVA_HOME: jdk, GHIDRA_INSTALL_DIR: ghidra }).resolve({ tool: 'ghidra', requestedBy: 'rea' })
    expect(result).toMatchObject({ status: 'found', version: '12.1.4', env: { GHIDRA_INSTALL_DIR: ghidra, JAVA_HOME: jdk } })
    expect((result as { bins: string[] }).bins).toContain(join(ghidra, 'support', 'analyzeHeadless'))
  })

  test('ghidra without a JDK answers needs for the JDK on behalf of ghidra', async () => {
    const ghidra = fakeGhidra('mac_arm_64')
    const result = await on('darwin-arm64', { GHIDRA_INSTALL_DIR: ghidra }).resolve({ tool: 'ghidra', requestedBy: 'rea' })
    expect(result).toMatchObject({ status: 'needs', tool: 'jdk', requestedBy: 'ghidra', canInstall: true, version: '21.0.12.1' })
    const status = (await on('darwin-arm64', { GHIDRA_INSTALL_DIR: ghidra }).list()).find((tool) => tool.id === 'ghidra')
    expect(status).toMatchObject({ status: 'found', requires: [{ tool: 'jdk', name: 'JDK (Eclipse Temurin)', version: '>=21', met: false }] })
  })

  test('a Ghidra without a native decompiler for this machine is unusable', async () => {
    const jdk = fakeJdk('21.0.4')
    const ghidra = fakeGhidra('linux_x86_64')
    const mac = await on('darwin-arm64', { JAVA_HOME: jdk, GHIDRA_INSTALL_DIR: ghidra }).resolve({ tool: 'ghidra', requestedBy: 'rea' })
    expect(mac).toMatchObject({ status: 'needs', tool: 'ghidra', canInstall: false, get: { brew: 'brew install ghidra' } })
    const arm = await on('linux-arm64', { JAVA_HOME: jdk, GHIDRA_INSTALL_DIR: ghidra }).resolve({ tool: 'ghidra', requestedBy: 'rea' })
    expect(arm).toMatchObject({ status: 'needs', tool: 'ghidra', canInstall: false })
    expect((arm as { get: { note?: string } }).get.note).toContain('no native decompiler')
  })

  test('ghidra installs only on linux-x64, into its top-level folder', async () => {
    const x64 = await on('linux-x64', {}).list()
    expect(x64.find((tool) => tool.id === 'ghidra')).toMatchObject({ status: 'missing', canInstall: true })
    const mac = await on('darwin-arm64', {}).list()
    expect(mac.find((tool) => tool.id === 'ghidra')).toMatchObject({ status: 'unavailable', canInstall: false })
    const ghidra = bakedManifest.tools.find((tool) => tool.id === 'ghidra')!
    expect(Object.keys(ghidra.versions[0]!.artifacts)).toEqual(['linux-x64'])
  })
})
