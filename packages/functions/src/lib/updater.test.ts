import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkForUpdate, compareVersions, stagedVersion } from './updater.js'

const base = 'https://releases.test/studio'
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex')

const releaseFetch = (version: string, files: Record<string, Uint8Array>, calls: string[] = []) =>
  (async (input: RequestInfo | URL) => {
    const url = String(input)
    calls.push(url)
    if (url === `${base}/latest.json`) return Response.json({ version })
    const file = files[url.replace(`${base}/${version}/`, '')]
    return file ? new Response(file as BodyInit) : new Response('missing', { status: 404 })
  }) as typeof fetch

describe('compareVersions', () => {
  test('orders by number, not text', () => {
    expect(compareVersions('0.10.0', '0.9.0')).toBe(1)
    expect(compareVersions('v1.0.0', '1.0.0')).toBe(0)
    expect(compareVersions('0.1.0', '0.1.1')).toBe(-1)
  })
})

describe('checkForUpdate', () => {
  let home: string
  beforeEach(async () => {
    home = await mkdtemp(join(tmpdir(), 'studio-update-'))
  })
  afterEach(() => rm(home, { recursive: true, force: true }))

  const archive = new TextEncoder().encode('archive bytes')
  const extract = async (bytes: Uint8Array, into: string) => {
    await writeFile(join(into, 'root'), bytes)
  }
  const options = (fetchImpl: typeof fetch, current = '0.1.0') => ({
    baseUrl: base,
    home,
    current,
    platform: 'linux-x64',
    fetch: fetchImpl,
    extract,
  })

  test('stages a newer release for this platform after verifying its checksum', async () => {
    const name = 'studio-0.2.0-linux-x64.tar.gz'
    const result = await checkForUpdate(
      options(
        releaseFetch('0.2.0', {
          [name]: archive,
          'studio-0.2.0-darwin-arm64.tar.gz': new Uint8Array([1]),
          SHA256SUMS: new TextEncoder().encode(`${sha(archive)}  ${name}\n`),
        })
      )
    )
    expect(result).toEqual({ status: 'staged', version: '0.2.0' })
    expect(await stagedVersion(home)).toBe('0.2.0')
    expect(await readFile(join(home, 'versions', '0.2.0', 'root'))).toEqual(Buffer.from(archive))
    expect(existsSync(join(home, 'versions', '0.2.0.partial'))).toBe(false)
  })

  test('does nothing when already on the latest version', async () => {
    const calls: string[] = []
    const result = await checkForUpdate(options(releaseFetch('0.1.0', {}, calls)))
    expect(result).toEqual({ status: 'current', version: '0.1.0' })
    expect(calls).toHaveLength(1)
    expect(await stagedVersion(home)).toBeNull()
  })

  test('discards a download whose checksum does not match', async () => {
    const name = 'studio-0.2.0-linux-x64.tar.gz'
    const result = await checkForUpdate(
      options(
        releaseFetch('0.2.0', {
          [name]: archive,
          SHA256SUMS: new TextEncoder().encode(`${'0'.repeat(64)}  ${name}\n`),
        })
      )
    )
    expect(result.status).toBe('unavailable')
    expect(await stagedVersion(home)).toBeNull()
    expect(existsSync(join(home, 'versions', '0.2.0'))).toBe(false)
  })

  test('reports a release with no build for this platform', async () => {
    const result = await checkForUpdate(
      options(
        releaseFetch('0.2.0', {
          'studio-0.2.0-darwin-arm64.tar.gz': archive,
          SHA256SUMS: new TextEncoder().encode(`${sha(archive)}  studio-0.2.0-darwin-arm64.tar.gz\n`),
        })
      )
    )
    expect(result).toEqual({ status: 'unavailable', reason: 'Release 0.2.0 has no build for linux-x64' })
  })

  test('does not download again once the version is staged', async () => {
    const name = 'studio-0.2.0-linux-x64.tar.gz'
    const files = {
      [name]: archive,
      SHA256SUMS: new TextEncoder().encode(`${sha(archive)}  ${name}\n`),
    }
    await checkForUpdate(options(releaseFetch('0.2.0', files)))
    const calls: string[] = []
    const again = await checkForUpdate(options(releaseFetch('0.2.0', files, calls)))
    expect(again).toEqual({ status: 'staged', version: '0.2.0' })
    expect(calls).toHaveLength(1)
  })

  test('survives an unreachable releases host', async () => {
    const failing = (async () => {
      throw new Error('offline')
    }) as unknown as typeof fetch
    expect(await checkForUpdate(options(failing))).toEqual({ status: 'unavailable', reason: 'offline' })
  })
})
