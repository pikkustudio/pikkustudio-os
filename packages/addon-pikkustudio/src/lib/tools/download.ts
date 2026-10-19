import { createHash } from 'node:crypto'
import { createReadStream, existsSync } from 'node:fs'
import { mkdir, open, rm, stat, statfs } from 'node:fs/promises'
import { dirname } from 'node:path'

export interface DownloadOptions {
  url: string
  sha256: string
  size?: number
  to: string
  onProgress?: (received: number, total: number | null) => void
}

const hashExisting = async (path: string, hash: ReturnType<typeof createHash>) => {
  for await (const chunk of createReadStream(path)) hash.update(chunk as Buffer)
}

export async function freeBytes(path: string) {
  const fs = await statfs(path)
  return fs.bavail * fs.bsize
}

export async function ensureSpace(dir: string, needed: number) {
  const free = await freeBytes(dir)
  if (free < needed) {
    throw new Error(`Not enough disk space: needs ${Math.ceil(needed / 1e6)} MB, ${Math.floor(free / 1e6)} MB free`)
  }
}

export async function download({ url, sha256, size, to, onProgress }: DownloadOptions) {
  const part = `${to}.part`
  await mkdir(dirname(to), { recursive: true })
  let have = existsSync(part) ? (await stat(part)).size : 0
  if (size) await ensureSpace(dirname(to), Math.max(0, size - have) + size * 3)
  const response = await fetch(url, { headers: have ? { Range: `bytes=${have}-` } : {} })
  const hash = createHash('sha256')
  if (response.status === 416 && size === have) {
    await response.body?.cancel()
    await hashExisting(part, hash)
  } else if (response.status === 206 || response.status === 200) {
    if (response.status === 200) have = 0
    if (have) await hashExisting(part, hash)
    const file = await open(part, have ? 'a' : 'w')
    try {
      const total = size ?? (Number(response.headers.get('content-length')) + have || null)
      let received = have
      for await (const chunk of response.body!) {
        hash.update(chunk)
        await file.write(chunk)
        received += chunk.length
        onProgress?.(received, total)
      }
    } finally {
      await file.close()
    }
  } else {
    await response.body?.cancel()
    if (response.status === 416) await rm(part, { force: true })
    throw new Error(`Download failed: ${response.status} ${url}`)
  }
  const digest = hash.digest('hex')
  if (digest !== sha256) {
    await rm(part, { force: true })
    throw new Error(`Checksum mismatch for ${url}: expected ${sha256}, got ${digest}`)
  }
  return part
}
