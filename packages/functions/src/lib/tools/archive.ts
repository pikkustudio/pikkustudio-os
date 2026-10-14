import { mkdir, symlink, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { inflateRawSync } from 'node:zlib'

export type Entry =
  | { kind: 'file'; name: string; mode: number; data: Uint8Array }
  | { kind: 'dir'; name: string }
  | { kind: 'symlink'; name: string; target: string }

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

export async function writeEntries(entries: Entry[], root: string) {
  const base = resolve(root)
  const planned = entries.map((entry) => {
    const path = safePath(base, entry.name)
    if (entry.kind === 'symlink' && (isAbsolute(entry.target) || !inside(base, resolve(dirname(path), entry.target)))) {
      throw new Error(`Refused symlink pointing outside its directory: ${entry.name} -> ${entry.target}`)
    }
    return { entry, path }
  })
  for (const { entry, path } of planned) {
    if (entry.kind === 'dir') {
      await mkdir(path, { recursive: true })
      continue
    }
    await mkdir(dirname(path), { recursive: true })
    if (entry.kind === 'symlink') await symlink(entry.target, path)
    else await writeFile(path, entry.data, { mode: entry.mode & 0o777 || 0o644 })
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

export function readTar(bytes: Uint8Array): Entry[] {
  const entries: Entry[] = []
  let offset = 0
  let pax: Record<string, string> = {}
  let longName: string | null = null
  let longLink: string | null = null
  while (offset + 512 <= bytes.length) {
    const header = bytes.subarray(offset, offset + 512)
    if (header.every((byte) => byte === 0)) break
    const size = octal(header, 124, 12)
    const type = String.fromCharCode(header[156]!)
    const data = bytes.subarray(offset + 512, offset + 512 + size)
    offset += 512 + Math.ceil(size / 512) * 512
    const prefix = field(header, 345, 155)
    const name = pax.path ?? longName ?? (prefix ? `${prefix}/${field(header, 0, 100)}` : field(header, 0, 100))
    const link = pax.linkpath ?? longLink ?? field(header, 157, 100)
    if (type === 'x') {
      pax = paxRecords(data)
      continue
    }
    if (type === 'L' || type === 'K') {
      if (type === 'L') longName = field(data, 0, data.length)
      else longLink = field(data, 0, data.length)
      continue
    }
    pax = {}
    longName = null
    longLink = null
    if (type === 'g') continue
    if (type === '0' || type === '\0' || type === '7') entries.push({ kind: 'file', name, mode: octal(header, 100, 8), data })
    else if (type === '5') entries.push({ kind: 'dir', name })
    else if (type === '2') entries.push({ kind: 'symlink', name, target: link })
    else throw new Error(`Refused archive entry of type ${type}: ${name}`)
  }
  return entries
}

export function readZip(bytes: Uint8Array): Entry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let end = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      end = i
      break
    }
  }
  if (end < 0) throw new Error('Not a zip archive')
  const count = view.getUint16(end + 10, true)
  let offset = view.getUint32(end + 16, true)
  if (count === 0xffff || offset === 0xffffffff) throw new Error('zip64 archives are not supported')
  const entries: Entry[] = []
  for (let i = 0; i < count; i++) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('Corrupt zip central directory')
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
    const mode = host === 3 ? attributes >>> 16 : 0
    if (name.endsWith('/')) {
      entries.push({ kind: 'dir', name })
      continue
    }
    const start = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true)
    const raw = bytes.subarray(start, start + compressed)
    const data = method === 0 ? raw : method === 8 ? new Uint8Array(inflateRawSync(raw)) : null
    if (!data) throw new Error(`Unsupported zip compression ${method}: ${name}`)
    if ((mode & 0o170000) === 0o120000) entries.push({ kind: 'symlink', name, target: text(data) })
    else entries.push({ kind: 'file', name, mode: mode & 0o777, data })
  }
  return entries
}

export const extractArchive = (bytes: Uint8Array<ArrayBuffer>, format: 'tar.gz' | 'zip', root: string) =>
  writeEntries(format === 'zip' ? readZip(bytes) : readTar(Bun.gunzipSync(bytes)), root)
