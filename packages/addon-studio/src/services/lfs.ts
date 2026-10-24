import { execFile } from 'node:child_process'
import { open, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)

export const LFS_TEXT_LIMIT = 500 * 1024

const SNIFF = 8000
const BATCH = 200

export const BINARY_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.bmp', '.ico', '.tiff', '.psd', '.heic',
  '.mp4', '.mov', '.webm', '.avi', '.mkv', '.mp3', '.wav', '.flac', '.ogg', '.m4a',
  '.pdf', '.zip', '.gz', '.tgz', '.tar', '.7z', '.rar', '.dmg', '.iso',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.sqlite', '.db', '.wasm', '.so', '.dylib', '.dll', '.exe', '.bin', '.glb', '.fig', '.sketch',
])

const git = (cwd: string, ...args: string[]) => exec('git', args, { cwd, maxBuffer: 64 << 20 })

let available: Promise<boolean> | undefined
const lfsAvailable = () => (available ??= exec('git', ['lfs', 'version']).then(() => true, () => false))

const hasNullByte = async (path: string) => {
  const handle = await open(path, 'r')
  try {
    const buffer = Buffer.alloc(SNIFF)
    const { bytesRead } = await handle.read(buffer, 0, SNIFF, 0)
    return buffer.subarray(0, bytesRead).includes(0)
  } finally {
    await handle.close()
  }
}

const exact = (path: string) => path.replace(/ /g, '[[:space:]]')

export const lfsPatternFor = async (cwd: string, path: string, size: number): Promise<string | null> => {
  const extension = extname(path).toLowerCase()
  if (BINARY_EXTENSIONS.has(extension)) return `*${extension}`
  if (await hasNullByte(join(cwd, path))) return extension ? `*${extension}` : exact(path)
  if (size > LFS_TEXT_LIMIT) return exact(path)
  return null
}

const alreadyLfs = async (cwd: string, paths: string[]) => {
  const tracked = new Set<string>()
  for (let i = 0; i < paths.length; i += BATCH) {
    const chunk = paths.slice(i, i + BATCH)
    const { stdout } = await git(cwd, 'check-attr', '-z', 'filter', '--', ...chunk)
    const parts = stdout.split('\0')
    for (let j = 0; j + 2 < parts.length; j += 3) if (parts[j + 2] === 'lfs') tracked.add(parts[j]!)
  }
  return tracked
}

export async function trackLargeFiles(cwd: string): Promise<string[]> {
  if (!(await lfsAvailable())) return []
  const listed = (await git(cwd, 'ls-files', '-z', '--others', '--modified', '--exclude-standard')).stdout
    .split('\0')
    .filter(Boolean)
  if (!listed.length) return []
  const skip = await alreadyLfs(cwd, listed)
  const patterns = new Set<string>()
  for (const path of listed) {
    if (skip.has(path)) continue
    const info = await stat(join(cwd, path)).catch(() => null)
    if (!info?.isFile()) continue
    const pattern = await lfsPatternFor(cwd, path, info.size)
    if (pattern) patterns.add(pattern)
  }
  if (!patterns.size) return []
  await git(cwd, 'lfs', 'install', '--local')
  await git(cwd, 'lfs', 'track', '--', ...patterns)
  return [...patterns]
}
