import { describe, expect, test } from 'bun:test'
import { chmodSync, mkdirSync, writeFileSync } from 'node:fs'
import { delimiter, join } from 'node:path'
import { bakedManifest, type Manifest } from './manifest.js'
import { tempDir, testManifest } from './fixtures.js'
import { ToolResolver } from './resolver.js'

const artifact = { url: 'http://127.0.0.1:1/shell.zip', sha256: 'a'.repeat(64), size: 1234 }

const fakeBin = (name: string, output: string) => {
  const dir = tempDir()
  writeFileSync(join(dir, name), `#!/bin/sh\necho "${output}"\n`)
  chmodSync(join(dir, name), 0o755)
  return dir
}

const fakeInstall = (home: string, version: string) => {
  const dir = join(home, 'tools', 'chromium', version)
  mkdirSync(join(dir, 'shell'), { recursive: true })
  writeFileSync(join(dir, 'shell', 'chrome-headless-shell'), '')
  writeFileSync(join(dir, 'installed.json'), JSON.stringify({ sha256: 'a'.repeat(64), url: artifact.url, installedAt: 'now' }))
  return dir
}

const resolver = (home: string, searchPath = '', manifest = testManifest({ 'linux-x64': artifact })) =>
  new ToolResolver({ home, manifest, platform: 'linux-x64', searchPath, coreBin: ['/core/bin'] })

describe('resolve', () => {
  test('finds a tool on the machine first', async () => {
    const bin = fakeBin('chrome-headless-shell', 'Chromium 154.0.8037.92')
    const result = await resolver(tempDir(), bin).resolve({ tool: 'chromium', requestedBy: 'test' })
    expect(result).toMatchObject({
      status: 'found',
      version: '154.0.8037.92',
      path: join(bin, 'chrome-headless-shell'),
      env: { PIKKU_CHROMIUM: join(bin, 'chrome-headless-shell') },
    })
  })

  test('a found tool outside the requested range falls through to installed, then needs', async () => {
    const bin = fakeBin('chrome-headless-shell', 'Chromium 120.0.6099.1')
    const home = tempDir()
    const tools = resolver(home, bin)
    expect((await tools.resolve({ tool: 'chromium', version: '>=150', requestedBy: 'test' })).status).toBe('needs')
    fakeInstall(home, '154.0.8037.92')
    expect(await tools.resolve({ tool: 'chromium', version: '>=150', requestedBy: 'test' })).toMatchObject({
      status: 'installed',
      version: '154.0.8037.92',
    })
    expect((await tools.resolve({ tool: 'chromium', version: '<130', requestedBy: 'test' })).status).toBe('found')
  })

  test('picks the newest installed version the range accepts', async () => {
    const home = tempDir()
    fakeInstall(home, '150.0.7000.1')
    fakeInstall(home, '154.0.8037.92')
    const tools = resolver(home)
    expect((await tools.resolve({ tool: 'chromium', requestedBy: 'test' })).version).toBe('154.0.8037.92')
    expect((await tools.resolve({ tool: 'chromium', version: '~150.0', requestedBy: 'test' })).version).toBe('150.0.7000.1')
  })

  test('answers needs with what it would install', async () => {
    const result = await resolver(tempDir()).resolve({ tool: 'chromium', requestedBy: 'checkPage' })
    expect(result).toEqual({
      status: 'needs',
      tool: 'chromium',
      name: 'Chromium (headless shell)',
      version: '154.0.8037.92',
      size: 1234,
      requestedBy: 'checkPage',
      get: { link: 'https://googlechromelabs.github.io/chrome-for-testing/' },
      canInstall: true,
    })
    const older = await resolver(tempDir()).resolve({ tool: 'chromium', version: '<151', requestedBy: 'test' })
    expect(older).toMatchObject({ status: 'needs', version: '150.0.7000.1' })
  })

  test('a platform without an artifact cannot install', async () => {
    const tools = new ToolResolver({ home: tempDir(), manifest: testManifest({ 'linux-x64': artifact }), platform: 'linux-arm64', searchPath: '' })
    expect(await tools.resolve({ tool: 'chromium', requestedBy: 'test' })).toMatchObject({ status: 'needs', canInstall: false, size: null })
    const [chromium] = await tools.list()
    expect(chromium).toMatchObject({ id: 'chromium', status: 'unavailable', canInstall: false })
  })

  test('find-only tools appear only on their platforms', async () => {
    const linux = new ToolResolver({ home: tempDir(), manifest: testManifest({}), platform: 'linux-x64', searchPath: '' })
    expect((await linux.list()).map((tool) => tool.id)).toEqual(['chromium'])
    const mac = new ToolResolver({ home: tempDir(), manifest: testManifest({}), platform: 'darwin-arm64', searchPath: '' })
    const xcode = (await mac.list()).find((tool) => tool.id === 'xcode')
    expect(xcode).toMatchObject({ status: 'missing', canInstall: false })
    expect(() => linux.entry('xcode')).toThrow(/Unknown tool/)
  })

  test('finds a running service by its endpoint', async () => {
    const server = Bun.serve({ port: 0, hostname: '127.0.0.1', fetch: () => Response.json({ version: '0.5.7' }) })
    const manifest: Manifest = {
      tools: [
        {
          id: 'ollama',
          name: 'Ollama',
          find: { endpoint: `http://127.0.0.1:${server.port}/api/version`, command: ['ollama', '--version'], version: '(\\d+\\.\\d+\\.\\d+)' },
          versions: [],
          env: {},
          get: {},
        },
      ],
    }
    const result = await resolver(tempDir(), '', manifest).resolve({ tool: 'ollama', requestedBy: 'test' })
    server.stop(true)
    expect(result).toMatchObject({ status: 'found', version: '0.5.7', bins: [] })
  })

  test('check again re-detects', async () => {
    const bin = tempDir()
    const tools = resolver(tempDir(), bin)
    expect((await tools.resolve({ tool: 'chromium', requestedBy: 'test' })).status).toBe('needs')
    writeFileSync(join(bin, 'chrome-headless-shell'), '#!/bin/sh\necho "Chromium 154.0.8037.92"\n')
    chmodSync(join(bin, 'chrome-headless-shell'), 0o755)
    expect((await tools.resolve({ tool: 'chromium', requestedBy: 'test' })).status).toBe('needs')
    tools.checkAgain()
    expect((await tools.resolve({ tool: 'chromium', requestedBy: 'test' })).status).toBe('found')
  })
})

describe('childEnv', () => {
  test('puts tool bins, then the core bin, then the user PATH, and adds the manifest env', async () => {
    const home = tempDir()
    const dir = fakeInstall(home, '154.0.8037.92')
    const before = process.env.PATH
    const { env, needs } = await resolver(home).childEnv([{ tool: 'chromium', requestedBy: 'test' }])
    expect(needs).toEqual([])
    const path = env.PATH!.split(delimiter)
    expect(path.slice(0, 2)).toEqual([join(dir, 'shell'), '/core/bin'])
    expect(path).toContain((before ?? '').split(delimiter)[0]!)
    expect(env.PIKKU_CHROMIUM).toBe(join(dir, 'shell', 'chrome-headless-shell'))
    expect(process.env.PATH).toBe(before)
  })

  test('reports unmet needs and leaves them off the PATH', async () => {
    const { env, needs } = await resolver(tempDir()).childEnv([{ tool: 'chromium', requestedBy: 'test' }])
    expect(needs).toHaveLength(1)
    expect(env.PIKKU_CHROMIUM).toBeUndefined()
    expect(env.PATH!.split(delimiter)[0]).toBe('/core/bin')
  })
})

describe('baked manifest', () => {
  test('every artifact is pinned and named per platform, and the core is not a tool', () => {
    for (const tool of bakedManifest.tools) {
      expect(typeof tool.env).toBe('object')
      for (const version of tool.versions) {
        for (const artifact of Object.values(version.artifacts)) {
          expect(artifact!.sha256).toMatch(/^[0-9a-f]{64}$/)
          expect(['zip', 'tar.gz']).toContain(artifact!.format)
          expect(artifact!.url).toStartWith('https://')
          expect(artifact!.bin.length).toBeGreaterThan(0)
        }
      }
    }
    expect(bakedManifest.tools.map((tool) => tool.id)).not.toContain('git')
    expect(bakedManifest.tools.map((tool) => tool.id)).not.toContain('uv')
  })
})
