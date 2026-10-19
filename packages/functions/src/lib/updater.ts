import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'

export const DEFAULT_DOWNLOADS_URL = 'https://downloads.pikkustudio.app/studio'
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000

export type UpdateResult =
  | { status: 'current'; version: string }
  | { status: 'staged'; version: string }
  | { status: 'unavailable'; reason: string }

export type UpdateOptions = {
  baseUrl: string
  home: string
  current: string
  platform?: string
  fetch?: typeof fetch
  extract?: (archive: Uint8Array, into: string) => Promise<void>
}

export const platformTag = (): string => `${process.platform}-${process.arch}`

export function compareVersions(a: string, b: string): number {
  const parts = (v: string) => v.replace(/^v/, '').split('.').map((n) => Number.parseInt(n, 10) || 0)
  const x = parts(a)
  const y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d) return d < 0 ? -1 : 1
  }
  return 0
}

export async function installedVersion(): Promise<string | null> {
  const file = join(dirname(process.execPath), 'VERSION')
  return existsSync(file) ? (await readFile(file, 'utf8')).trim() || null : null
}

export async function stagedVersion(home: string): Promise<string | null> {
  const file = join(home, 'staged')
  return existsSync(file) ? (await readFile(file, 'utf8')).trim() || null : null
}

const untar = (archive: Uint8Array, into: string): Promise<void> =>
  new Promise((resolve, reject) => {
    const child = spawn('tar', ['xz', '-C', into, '--strip-components=1'], { stdio: ['pipe', 'ignore', 'pipe'] })
    let stderr = ''
    child.stderr.on('data', (chunk) => (stderr += chunk))
    child.on('error', reject)
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`tar exited ${code}: ${stderr.trim()}`))))
    child.stdin.end(archive)
  })

export async function checkForUpdate(options: UpdateOptions): Promise<UpdateResult> {
  const { baseUrl, home, current } = options
  const request = options.fetch ?? fetch
  const platform = options.platform ?? platformTag()
  const headers = { 'user-agent': 'pikku-studio-updater' }

  try {
    const latest = await request(`${baseUrl}/latest.json`, { headers })
    if (!latest.ok) return { status: 'unavailable', reason: `Could not read the latest release (HTTP ${latest.status})` }
    const version = String(((await latest.json()) as { version: string }).version).replace(/^v/, '')
    if (compareVersions(version, current) <= 0) return { status: 'current', version: current }
    if ((await stagedVersion(home)) === version) return { status: 'staged', version }

    const name = `studio-${version}-${platform}.tar.gz`
    const sumsResponse = await request(`${baseUrl}/${version}/SHA256SUMS`, { headers })
    if (!sumsResponse.ok) return { status: 'unavailable', reason: `Release ${version} has no SHA256SUMS` }
    const expected = (await sumsResponse.text())
      .split('\n')
      .map((line) => line.trim().split(/\s+/))
      .find(([, file]) => file === name)?.[0]
    if (!expected) return { status: 'unavailable', reason: `Release ${version} has no build for ${platform}` }

    const archive = await request(`${baseUrl}/${version}/${name}`, { headers })
    if (!archive.ok) throw new Error(`${name}: HTTP ${archive.status}`)
    const bytes = new Uint8Array(await archive.arrayBuffer())
    const actual = createHash('sha256').update(bytes).digest('hex')
    if (actual !== expected) return { status: 'unavailable', reason: `Checksum mismatch for ${name}; the download was discarded` }

    const versions = join(home, 'versions')
    const partial = join(versions, `${version}.partial`)
    await rm(partial, { recursive: true, force: true })
    await mkdir(partial, { recursive: true })
    await (options.extract ?? untar)(bytes, partial)
    await rm(join(versions, version), { recursive: true, force: true })
    await rename(partial, join(versions, version))
    await writeFile(join(home, 'staged'), `${version}\n`)
    return { status: 'staged', version }
  } catch (error) {
    return { status: 'unavailable', reason: error instanceof Error ? error.message : String(error) }
  }
}

export type UpdaterLogger = { info: (message: string) => void; warn: (message: string) => void }

export function startUpdater(
  home: string,
  current: string,
  logger: UpdaterLogger,
  env: NodeJS.ProcessEnv = process.env
): () => void {
  const baseUrl = env.PIKKU_STUDIO_DOWNLOADS_URL ?? DEFAULT_DOWNLOADS_URL
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const result = await checkForUpdate({ baseUrl, home, current })
      if (result.status === 'staged') logger.info(`Studio ${result.version} is downloaded and will start on the next launch`)
      else if (result.status === 'unavailable') logger.warn(`Update check skipped: ${result.reason}`)
    } finally {
      running = false
    }
  }
  void tick()
  const timer = setInterval(() => void tick(), CHECK_EVERY_MS)
  timer.unref()
  return () => clearInterval(timer)
}
