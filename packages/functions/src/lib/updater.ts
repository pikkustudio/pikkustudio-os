import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'

export const DEFAULT_RELEASES_REPO = 'pikkujs/studio'
const CHECK_EVERY_MS = 6 * 60 * 60 * 1000

type Asset = { name: string; url: string }
type Release = { tag_name: string; assets: Asset[] }

export type UpdateResult =
  | { status: 'current'; version: string }
  | { status: 'staged'; version: string }
  | { status: 'unavailable'; reason: string }

export type UpdateOptions = {
  repo: string
  home: string
  current: string
  token?: string
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
  const { repo, home, current, token } = options
  const request = options.fetch ?? fetch
  const platform = options.platform ?? platformTag()
  const auth: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {}
  const headers = { 'user-agent': 'pikku-studio-updater', ...auth }

  const download = async (asset: Asset): Promise<Uint8Array> => {
    const response = await request(asset.url, { headers: { ...headers, accept: 'application/octet-stream' } })
    if (!response.ok) throw new Error(`${asset.name}: HTTP ${response.status}`)
    return new Uint8Array(await response.arrayBuffer())
  }

  try {
    const response = await request(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers: { ...headers, accept: 'application/vnd.github+json' },
    })
    if (!response.ok) return { status: 'unavailable', reason: `Could not read the latest release (HTTP ${response.status})` }
    const release = (await response.json()) as Release
    const version = release.tag_name.replace(/^v/, '')
    if (compareVersions(version, current) <= 0) return { status: 'current', version: current }
    if ((await stagedVersion(home)) === version) return { status: 'staged', version }

    const name = `studio-${version}-${platform}.tar.gz`
    const archive = release.assets.find((a) => a.name === name)
    const sums = release.assets.find((a) => a.name === 'SHA256SUMS')
    if (!archive) return { status: 'unavailable', reason: `Release ${version} has no build for ${platform}` }
    if (!sums) return { status: 'unavailable', reason: `Release ${version} has no SHA256SUMS` }

    const expected = new TextDecoder()
      .decode(await download(sums))
      .split('\n')
      .map((line) => line.trim().split(/\s+/))
      .find(([, file]) => file === name)?.[0]
    if (!expected) return { status: 'unavailable', reason: `SHA256SUMS has no entry for ${name}` }

    const bytes = await download(archive)
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
  const repo = env.PIKKU_STUDIO_RELEASES_REPO ?? DEFAULT_RELEASES_REPO
  const token = env.PIKKU_STUDIO_UPDATE_TOKEN ?? env.GITHUB_TOKEN
  let running = false
  const tick = async () => {
    if (running) return
    running = true
    try {
      const result = await checkForUpdate({ repo, home, current, token })
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
