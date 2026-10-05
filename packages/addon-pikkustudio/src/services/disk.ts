import { execFile } from 'node:child_process'
import { readdir, stat, statfs } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { promisify } from 'node:util'
import { BINARY_EXTENSIONS } from './lfs.js'

const exec = promisify(execFile)

const PACKAGES = new Set(['node_modules'])
const OTHER = new Set(['.git', 'repo.git', '.pikku', 'dist', 'build', '.next', '.turbo', '.vite', '.cache', 'coverage', '.wrangler'])
const MB = 1024 * 1024

export interface DiskUsage {
  packagesMb: number
  codeMb: number
  mediaMb: number
  otherMb: number
  freeMb: number
}

const du = async (path: string) => {
  const { stdout } = await exec('du', ['-sk', path], { maxBuffer: 1 << 20 }).catch(() => ({ stdout: '0' }))
  return (Number.parseInt(stdout, 10) || 0) / 1024
}

const sizeOf = async (path: string) => (await stat(path).catch(() => null))?.size ?? 0

export async function diskUsage(root: string): Promise<DiskUsage> {
  const total = { packagesMb: 0, codeMb: 0, mediaMb: 0, otherMb: 0 }
  const walk = async (dir: string): Promise<void> => {
    const entries = await readdir(dir, { withFileTypes: true }).catch(() => [])
    await Promise.all(
      entries.map(async (e) => {
        const path = join(dir, e.name)
        if (e.isSymbolicLink()) return
        if (e.isDirectory()) {
          if (PACKAGES.has(e.name)) total.packagesMb += await du(path)
          else if (OTHER.has(e.name)) total.otherMb += await du(path)
          else await walk(path)
          return
        }
        if (!e.isFile()) return
        const mb = (await sizeOf(path)) / MB
        if (BINARY_EXTENSIONS.has(extname(e.name).toLowerCase())) total.mediaMb += mb
        else total.codeMb += mb
      }),
    )
  }
  await walk(root)
  const fs = await statfs(root).catch(() => null)
  const round = (n: number) => Math.round(n * 10) / 10
  return {
    packagesMb: round(total.packagesMb),
    codeMb: round(total.codeMb),
    mediaMb: round(total.mediaMb),
    otherMb: round(total.otherMb),
    freeMb: fs ? Math.round((fs.bavail * fs.bsize) / MB) : 0,
  }
}
