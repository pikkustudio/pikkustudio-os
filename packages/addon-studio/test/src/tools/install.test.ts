import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { makeTarGz, makeZip, serveFiles, sha256, tempDir, testManifest } from './fixtures.js'
import { ToolResolver } from '../../../src/lib/tools/resolver.js'

const archive = makeZip([{ name: 'shell/chrome-headless-shell', data: '#!/bin/sh\necho "Chromium 154.0.8037.92"\n', mode: 0o644 }])
let server: ReturnType<typeof serveFiles>

afterEach(() => server?.stop())

const resolver = (home: string, artifact: { url: string; sha256: string; size?: number; format?: 'zip' | 'tar.gz' }, autoInstall?: string[]) =>
  new ToolResolver({
    home,
    manifest: testManifest({ 'linux-x64': artifact }),
    platform: 'linux-x64',
    searchPath: '',
    autoInstall,
  })

describe('install', () => {
  test('downloads, verifies, unpacks, marks bins executable and records installed.json', async () => {
    server = serveFiles({ '/shell.zip': archive })
    const home = tempDir()
    const tools = resolver(home, { url: server.url('/shell.zip'), sha256: sha256(archive), size: archive.length })
    const { path, version } = await tools.install('chromium')
    expect(version).toBe('154.0.8037.92')
    expect(path).toBe(join(home, 'tools', 'chromium', '154.0.8037.92'))
    expect(statSync(join(path, 'shell/chrome-headless-shell')).mode & 0o111).not.toBe(0)
    const record = JSON.parse(readFileSync(join(path, 'installed.json'), 'utf8'))
    expect(record).toMatchObject({ sha256: sha256(archive), url: server.url('/shell.zip') })
    expect(readdirSync(join(home, 'tools', 'chromium'))).toEqual(['154.0.8037.92'])
    expect(readdirSync(join(home, 'tools', '.downloads'))).toEqual([])
    const resolved = await tools.resolve({ tool: 'chromium', requestedBy: 'test' })
    expect(resolved.status).toBe('installed')
  })

  test('unpacks a tar.gz artifact', async () => {
    const tar = makeTarGz([{ name: 'shell/chrome-headless-shell', data: '#!/bin/sh\n' }])
    server = serveFiles({ '/shell.tar.gz': tar })
    const home = tempDir()
    const tools = resolver(home, { url: server.url('/shell.tar.gz'), sha256: sha256(tar), format: 'tar.gz' })
    const { path } = await tools.install('chromium')
    expect(existsSync(join(path, 'shell/chrome-headless-shell'))).toBe(true)
  })

  test('a checksum mismatch deletes the download and installs nothing', async () => {
    server = serveFiles({ '/shell.zip': archive })
    const home = tempDir()
    const tools = resolver(home, { url: server.url('/shell.zip'), sha256: '0'.repeat(64) })
    await expect(tools.install('chromium')).rejects.toThrow(/Checksum mismatch/)
    expect(readdirSync(join(home, 'tools', '.downloads'))).toEqual([])
    expect(existsSync(join(home, 'tools', 'chromium'))).toBe(false)
  })

  test('resumes a partial download with a Range request', async () => {
    server = serveFiles({ '/shell.zip': archive })
    const home = tempDir()
    const digest = sha256(archive)
    mkdirSync(join(home, 'tools', '.downloads'), { recursive: true })
    writeFileSync(join(home, 'tools', '.downloads', `${digest}.part`), archive.subarray(0, 40))
    const tools = resolver(home, { url: server.url('/shell.zip'), sha256: digest, size: archive.length })
    await tools.install('chromium')
    expect(server.ranges).toEqual(['bytes=40-'])
    expect((await tools.resolve({ tool: 'chromium', requestedBy: 'test' })).status).toBe('installed')
  })

  test('installs only manifest versions and only where an artifact exists', async () => {
    const home = tempDir()
    const tools = resolver(home, { url: 'http://127.0.0.1:1/never', sha256: '0'.repeat(64) })
    await expect(tools.install('chromium', '1.2.3')).rejects.toThrow(/no version/)
    await expect(tools.install('git')).rejects.toThrow(/Unknown tool/)
    const elsewhere = new ToolResolver({ home, manifest: testManifest({}), platform: 'linux-arm64', searchPath: '' })
    await expect(elsewhere.install('chromium')).rejects.toThrow(/not available on this machine/)
  })

  test('remove deletes an installed version and refuses one that is not installed', async () => {
    server = serveFiles({ '/shell.zip': archive })
    const home = tempDir()
    const tools = resolver(home, { url: server.url('/shell.zip'), sha256: sha256(archive) })
    await tools.install('chromium')
    await expect(tools.remove('chromium', '../..')).rejects.toThrow(/not installed/)
    await tools.remove('chromium', '154.0.8037.92')
    expect(existsSync(join(home, 'tools', 'chromium', '154.0.8037.92'))).toBe(false)
    expect((await tools.resolve({ tool: 'chromium', requestedBy: 'test' })).status).toBe('needs')
  })

  test('ensure installs an allowed tool and answers needs for anything else', async () => {
    server = serveFiles({ '/shell.zip': archive })
    const artifact = { url: server.url('/shell.zip'), sha256: sha256(archive) }
    const blocked = await resolver(tempDir(), artifact).ensure([{ tool: 'chromium', requestedBy: 'checkPage' }])
    expect(blocked[0]).toMatchObject({ status: 'needs', tool: 'chromium', requestedBy: 'checkPage' })
    const allowed = await resolver(tempDir(), artifact, ['chromium']).ensure([{ tool: 'chromium', requestedBy: 'checkPage' }])
    expect(allowed[0]).toMatchObject({ status: 'installed', version: '154.0.8037.92' })
  })
})
