import { createReadStream } from 'node:fs'
import { mkdir, open, rm, symlink } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { pipeline } from 'node:stream'
import { createGunzip } from 'node:zlib'

const inside = (root: string, path: string) => {
  const rel = relative(root, path)
  return rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))
}

export const safePath = (root: string, name: string) => {
  const clean = name.replace(/\/+$/, '')
  if (!clean || isAbsolute(clean) || clean.split(/[\\/]/).includes('..')) {
    throw new Error(`Refused archive entry outside its directory: ${name}`)
  }
  const path = resolve(root, clean)
  if (!inside(root, path)) throw new Error(`Refused archive entry outside its directory: ${name}`)
  return path
}

class Sink {
  private created: string[] = []

  constructor(private base: string) {}

  private async dirs(dir: string) {
    const first = await mkdir(dir, { recursive: true })
    if (first) this.created.push(first)
  }

  async dir(name: string) {
    await this.dirs(safePath(this.base, name))
  }

  async symlink(name: string, target: string) {
    const path = safePath(this.base, name)
    if (isAbsolute(target) || !inside(this.base, resolve(dirname(path), target))) {
      throw new Error(`Refused symlink pointing outside its directory: ${name} -> ${target}`)
    }
    await this.dirs(dirname(path))
    await symlink(target, path)
    this.created.push(path)
  }

  async file(name: string, mode: number, chunks: AsyncIterable<Uint8Array>) {
    const path = safePath(this.base, name)
    await this.dirs(dirname(path))
    this.created.push(path)
    const handle = await open(path, 'w', mode & 0o777 || 0o644)
    try {
      for await (const chunk of chunks) await handle.write(chunk)
    } finally {
      await handle.close()
    }
  }

  async rollback() {
    for (const path of this.created.reverse()) await rm(path, { recursive: true, force: true })
  }
}

const text = (bytes: Uint8Array) => new TextDecoder().decode(bytes)
const field = (bytes: Uint8Array, start: number, length: number) => text(bytes.subarray(start, start + length)).replace(/\0.*$/s, '')
const octal = (bytes: Uint8Array, start: number, length: number) => {
  if (bytes[start]! & 0x80) {
    let value = 0
    for (let i = start + 1; i < start + length; i++) value = value * 256 + bytes[i]!
    return value
  }
  return parseInt(field(bytes, start, length).trim() || '0', 8)
}

const paxRecords = (data: Uint8Array) => {
  const records: Record<string, string> = {}
  for (const line of text(data).split('\n')) {
    const match = /^\d+ ([^=]+)=(.*)$/s.exec(line)
    if (match) records[match[1]!] = match[2]!
  }
  return records
}

class Reader {
  private pending: Uint8Array | null = null
  private source: AsyncIterator<Uint8Array>

  constructor(source: AsyncIterable<Uint8Array>) {
    this.source = source[Symbol.asyncIterator]()
  }

  private async next() {
    if (this.pending) {
      const chunk = this.pending
      this.pending = null
      return chunk
    }
    const { value, done } = await this.source.next()
    return done ? null : value
  }

  take(length: number): Promise<Uint8Array>
  take(length: number, allowEnd: true): Promise<Uint8Array | null>
  async take(length: number, allowEnd = false): Promise<Uint8Array | null> {
    const out = new Uint8Array(length)
    let filled = 0
    while (filled < length) {
      const chunk = await this.next()
      if (!chunk) {
        if (allowEnd && filled === 0) return null
        throw new Error('Truncated archive')
      }
      const used = Math.min(chunk.length, length - filled)
      out.set(chunk.subarray(0, used), filled)
      filled += used
      if (used < chunk.length) this.pending = chunk.subarray(used)
    }
    return out
  }

  async *stream(length: number) {
    let left = length
    while (left > 0) {
      const chunk = await this.next()
      if (!chunk) throw new Error('Truncated archive')
      const used = Math.min(chunk.length, left)
      left -= used
      if (used < chunk.length) this.pending = chunk.subarray(used)
      yield chunk.subarray(0, used)
    }
  }

  async skip(length: number) {
    for await (const _ of this.stream(length));
  }
}

const gunzip = (path: string) => {
  const out = createGunzip()
  pipeline(createReadStream(path), out, () => {})
  return out as AsyncIterable<Uint8Array>
}

async function extractTar(path: string, sink: Sink) {
  const reader = new Reader(gunzip(path))
  let pax: Record<string, string> = {}
  let longName: string | null = null
  let longLink: string | null = null
  for (;;) {
    const header = await reader.take(512, true)
    if (!header || header.every((byte) => byte === 0)) break
    const size = octal(header, 124, 12)
    const padding = Math.ceil(size / 512) * 512 - size
    const type = String.fromCharCode(header[156]!)
    const prefix = field(header, 345, 155)
    const name = pax.path ?? longName ?? (prefix ? `${prefix}/${field(header, 0, 100)}` : field(header, 0, 100))
    const link = pax.linkpath ?? longLink ?? field(header, 157, 100)
    if (type === 'x' || type === 'L' || type === 'K' || type === 'g') {
      const data = await reader.take(size)
      await reader.skip(padding)
      if (type === 'x') pax = paxRecords(data)
      else if (type === 'L') longName = field(data, 0, data.length)
      else if (type === 'K') longLink = field(data, 0, data.length)
      continue
    }
    pax = {}
    longName = null
    longLink = null
    if (type === '0' || type === '\0' || type === '7') {
      await sink.file(name, octal(header, 100, 8), reader.stream(size))
    } else {
      await reader.skip(size)
      if (type === '5') await sink.dir(name)
      else if (type === '2') await sink.symlink(name, link)
      else throw new Error(`Refused archive entry of type ${type}: ${name}`)
    }
    await reader.skip(padding)
  }
}

async function* inflated(slice: Blob): AsyncIterable<Uint8Array> {
  yield* slice.stream().pipeThrough(new DecompressionStream('deflate-raw')) as unknown as AsyncIterable<Uint8Array>
}

async function* chunked(slice: Blob): AsyncIterable<Uint8Array> {
  yield* slice.stream() as unknown as AsyncIterable<Uint8Array>
}

async function extractZip(path: string, sink: Sink) {
  const file = Bun.file(path)
  const length = file.size
  const tailStart = Math.max(0, length - 65557)
  const tail = new Uint8Array(await file.slice(tailStart, length).arrayBuffer())
  const tailView = new DataView(tail.buffer)
  let end = -1
  for (let i = tail.length - 22; i >= 0; i--) {
    if (tailView.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error('Not a zip archive')
  const count = tailView.getUint16(end + 10, true)
  const directorySize = tailView.getUint32(end + 12, true)
  const directoryOffset = tailView.getUint32(end + 16, true)
  if (count === 0xffff || directoryOffset === 0xffffffff || directorySize === 0xffffffff) {
    throw new Error('zip64 archives are not supported')
  }
  if (directoryOffset + directorySize > length) throw new Error('Truncated archive')
  const bytes = new Uint8Array(await file.slice(directoryOffset, directoryOffset + directorySize).arrayBuffer())
  const view = new DataView(bytes.buffer)
  let offset = 0
  const entries: Array<{ name: string; mode: number; method: number; compressed: number; local: number }> = []
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || view.getUint32(offset, true) !== 0x02014b50) throw new Error('Corrupt zip central directory')
    const host = view.getUint16(offset + 4, true) >> 8
    const flags = view.getUint16(offset + 8, true)
    const method = view.getUint16(offset + 10, true)
    const compressed = view.getUint32(offset + 20, true)
    const nameLength = view.getUint16(offset + 28, true)
    const extraLength = view.getUint16(offset + 30, true)
    const commentLength = view.getUint16(offset + 32, true)
    const attributes = view.getUint32(offset + 38, true)
    const local = view.getUint32(offset + 42, true)
    const name = text(bytes.subarray(offset + 46, offset + 46 + nameLength))
    offset += 46 + nameLength + extraLength + commentLength
    if (flags & 1) throw new Error(`Refused encrypted zip entry: ${name}`)
    entries.push({ name, mode: host === 3 ? attributes >>> 16 : 0, method, compressed, local })
  }
  for (const { name, mode, method, compressed, local } of entries) {
    if (name.endsWith('/')) {
      await sink.dir(name)
      continue
    }
    if (method !== 0 && method !== 8) throw new Error(`Unsupported zip compression ${method}: ${name}`)
    if (local + 30 > length) throw new Error('Truncated archive')
    const localView = new DataView(await file.slice(local, local + 30).arrayBuffer())
    const start = local + 30 + localView.getUint16(26, true) + localView.getUint16(28, true)
    if (start + compressed > length) throw new Error('Truncated archive')
    const slice = file.slice(start, start + compressed)
    const data = method === 0 ? chunked(slice) : inflated(slice)
    if ((mode & 0o170000) === 0o120000) {
      const parts: Uint8Array[] = []
      for await (const chunk of data) parts.push(chunk)
      await sink.symlink(name, text(Buffer.concat(parts)))
    } else {
      await sink.file(name, mode & 0o777, data)
    }
  }
}

export async function extractArchive(path: string, format: 'tar.gz' | 'zip', root: string) {
  const sink = new Sink(resolve(root))
  try {
    await (format === 'zip' ? extractZip(path, sink) : extractTar(path, sink))
  } catch (error) {
    await sink.rollback()
    throw error
  }
}
