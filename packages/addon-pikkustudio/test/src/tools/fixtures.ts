import { createHash } from 'node:crypto'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Manifest, Platform } from '../../../src/lib/tools/manifest.js'

export interface FixtureEntry {
  name: string
  data?: string
  mode?: number
  link?: string
  dir?: boolean
}

const bytes = (value: string) => new TextEncoder().encode(value)

export const tempDir = (prefix = 'studio-tools-') => mkdtempSync(join(tmpdir(), prefix))

export const sha256 = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')

export function makeTarGz(entries: FixtureEntry[]) {
  const blocks: Uint8Array[] = []
  for (const entry of entries) {
    const header = new Uint8Array(512)
    const data = bytes(entry.data ?? '')
    const put = (value: string, offset: number) => header.set(bytes(value), offset)
    put(entry.name, 0)
    put(`${(entry.mode ?? 0o644).toString(8).padStart(7, '0')}\0`, 100)
    put(`${(entry.link || entry.dir ? 0 : data.length).toString(8).padStart(11, '0')}\0`, 124)
    put(entry.link !== undefined ? '2' : entry.dir ? '5' : '0', 156)
    if (entry.link !== undefined) put(entry.link, 157)
    put('ustar\0', 257)
    blocks.push(header)
    if (!entry.link && !entry.dir) {
      const padded = new Uint8Array(Math.ceil(data.length / 512) * 512)
      padded.set(data)
      blocks.push(padded)
    }
  }
  blocks.push(new Uint8Array(1024))
  return Bun.gzipSync(Buffer.concat(blocks))
}

export function makeZip(entries: FixtureEntry[]) {
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0
  for (const entry of entries) {
    const name = bytes(entry.dir ? `${entry.name.replace(/\/$/, '')}/` : entry.name)
    const data = bytes(entry.link ?? entry.data ?? '')
    const mode = entry.link !== undefined ? 0o120777 : entry.dir ? 0o40755 : 0o100000 | (entry.mode ?? 0o644)
    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint32(18, data.length, true)
    local.setUint32(22, data.length, true)
    local.setUint16(26, name.length, true)
    locals.push(new Uint8Array(local.buffer), name, data)
    const central = new DataView(new ArrayBuffer(46))
    central.setUint32(0, 0x02014b50, true)
    central.setUint16(4, 0x031e, true)
    central.setUint32(20, data.length, true)
    central.setUint32(24, data.length, true)
    central.setUint16(28, name.length, true)
    central.setUint32(38, mode << 16 >>> 0, true)
    central.setUint32(42, offset, true)
    centrals.push(new Uint8Array(central.buffer), name)
    offset += 30 + name.length + data.length
  }
  const size = centrals.reduce((total, part) => total + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, entries.length, true)
  end.setUint16(10, entries.length, true)
  end.setUint32(12, size, true)
  end.setUint32(16, offset, true)
  return new Uint8Array(Buffer.concat([...locals, ...centrals, new Uint8Array(end.buffer)]))
}

export function serveFiles(files: Record<string, Uint8Array<ArrayBuffer>>) {
  const ranges: string[] = []
  const server = Bun.serve({
    port: 0,
    hostname: '127.0.0.1',
    fetch(request) {
      const body = files[new URL(request.url).pathname]
      if (!body) return new Response('missing', { status: 404 })
      const range = request.headers.get('range')
      if (!range) return new Response(body)
      ranges.push(range)
      const start = Number(/bytes=(\d+)-/.exec(range)?.[1] ?? 0)
      if (start >= body.length) return new Response(null, { status: 416 })
      return new Response(body.subarray(start), {
        status: 206,
        headers: { 'content-range': `bytes ${start}-${body.length - 1}/${body.length}` },
      })
    },
  })
  return { url: (path: string) => `http://127.0.0.1:${server.port}${path}`, ranges, stop: () => server.stop(true) }
}

export const testManifest = (artifacts: Partial<Record<Platform, { url: string; sha256: string; size?: number; format?: 'zip' | 'tar.gz' }>>, bin = 'shell/chrome-headless-shell'): Manifest => ({
  tools: [
    {
      id: 'chromium',
      name: 'Chromium (headless shell)',
      find: { command: ['chrome-headless-shell', '--version'], version: '(\\d+\\.\\d+\\.\\d+\\.\\d+)' },
      versions: [
        {
          version: '154.0.8037.92',
          default: true,
          artifacts: Object.fromEntries(
            Object.entries(artifacts).map(([platform, artifact]) => [platform, { format: 'zip', bin: [bin], ...artifact }]),
          ),
        },
        {
          version: '150.0.7000.1',
          artifacts: Object.fromEntries(
            Object.entries(artifacts).map(([platform, artifact]) => [platform, { format: 'zip', bin: [bin], ...artifact }]),
          ),
        },
      ],
      env: { PIKKU_CHROMIUM: '${bin}' },
      get: { link: 'https://googlechromelabs.github.io/chrome-for-testing/' },
    },
    {
      id: 'xcode',
      name: 'Xcode',
      platforms: ['darwin'],
      find: { command: ['xcodebuild', '-version'], version: 'Xcode (\\d+(?:\\.\\d+)*)' },
      versions: [],
      env: {},
      get: { link: 'https://apps.apple.com/app/xcode/id497799835' },
    },
  ],
})
