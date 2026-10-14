import { existsSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { extractArchive } from './archive.js'
import { download } from './download.js'
import type { Artifact } from './manifest.js'

export interface InstalledRecord {
  sha256: string
  url: string
  installedAt: string
}

export const toolsRoot = (home: string) => join(home, 'tools')
export const versionDir = (home: string, id: string, version: string) => join(toolsRoot(home), id, version)

export async function installedVersions(home: string, id: string) {
  const dir = join(toolsRoot(home), id)
  if (!existsSync(dir)) return []
  const names = await readdir(dir)
  const found: Array<{ version: string; dir: string; record: InstalledRecord }> = []
  for (const version of names) {
    const record = join(dir, version, 'installed.json')
    if (!existsSync(record)) continue
    found.push({ version, dir: join(dir, version), record: JSON.parse(await readFile(record, 'utf8')) })
  }
  return found
}

const clearQuarantine = async (dir: string) => {
  if (process.platform !== 'darwin') return
  await Bun.spawn(['xattr', '-dr', 'com.apple.quarantine', dir], { stdout: 'ignore', stderr: 'ignore' }).exited
}

export async function installArtifact(
  home: string,
  id: string,
  version: string,
  artifact: Artifact,
  onProgress?: (received: number, total: number | null) => void,
) {
  const dir = versionDir(home, id, version)
  if (existsSync(join(dir, 'installed.json'))) return dir
  const archive = join(toolsRoot(home), '.downloads', artifact.sha256)
  const part = await download({ url: artifact.url, sha256: artifact.sha256, size: artifact.size, to: archive, onProgress })
  const staging = `${dir}.${process.pid}`
  await rm(staging, { recursive: true, force: true })
  await mkdir(staging, { recursive: true })
  try {
    await extractArchive(await Bun.file(part).bytes(), artifact.format, staging)
    for (const bin of artifact.bin) await chmod(join(staging, bin), 0o755)
    await clearQuarantine(staging)
    const record: InstalledRecord = { sha256: artifact.sha256, url: artifact.url, installedAt: new Date().toISOString() }
    await writeFile(join(staging, 'installed.json'), JSON.stringify(record, null, 2) + '\n')
    await rm(dir, { recursive: true, force: true })
    await rename(staging, dir).catch(async (error) => {
      if (!existsSync(join(dir, 'installed.json'))) throw error
    })
  } finally {
    await rm(staging, { recursive: true, force: true })
  }
  await rm(part, { force: true })
  return dir
}

export async function removeVersion(home: string, id: string, version: string) {
  const dir = versionDir(home, id, version)
  if (!existsSync(join(dir, 'installed.json'))) throw new Error(`${id} ${version} is not installed`)
  await rm(join(dir, 'installed.json'))
  await rm(dir, { recursive: true, force: true })
}

export async function dirSize(dir: string): Promise<number> {
  let total = 0
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile()) total += Bun.file(join(entry.parentPath, entry.name)).size
  }
  return total
}
