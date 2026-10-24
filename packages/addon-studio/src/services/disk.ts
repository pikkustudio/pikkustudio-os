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
  skipped: number
}

let skipped = 0

const du = async (path: string) => {
  const { stdout } = await exec('du', ['-sk', path], { maxBuffer: 1 << 20, timeout: 8_000 }).catch(() => {
    skipped++
    return { stdout: '0' }
  })
  return (Number.parseInt(stdout, 10) || 0) / 1024
}

const sizeOf = async (path: string) => (await stat(path).catch(() => null))?.size ?? 0

const git = async (cwd: string, ...args: string[]) =>
  (await exec('git', args, { cwd, maxBuffer: 256 << 20 })).stdout.split('\0').filter(Boolean)

const sizes = async (paths: string[]) => {
  const out: number[] = []
  for (let i = 0; i < paths.length; i += 200) out.push(...(await Promise.all(paths.slice(i, i + 200).map(sizeOf))))
  return out
}

const inGit = (root: string) => exec('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root }).then(() => true, () => false)

async function gitUsage(root: string) {
  const total = { packagesMb: 0, codeMb: 0, mediaMb: 0, otherMb: 0 }
  const files = await git(root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard')
  const bytes = await sizes(files.map((f) => join(root, f)))
  files.forEach((f, i) => {
    const mb = bytes[i]! / MB
    if (BINARY_EXTENSIONS.has(extname(f).toLowerCase())) total.mediaMb += mb
    else total.codeMb += mb
  })
  const ignored = await git(root, 'ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--directory')
  await Promise.all(
    ignored.map(async (entry) => {
      const path = join(root, entry)
      if (!entry.endsWith('/')) {
        total.otherMb += (await sizeOf(path)) / MB
        return
      }
      const name = entry.replace(/\/$/, '').split('/').pop()
      if (name && PACKAGES.has(name)) total.packagesMb += await du(path)
      else total.otherMb += await du(path)
    }),
  )
  total.otherMb += await du(join(root, '.git'))
  return total
}

export async function diskUsage(root: string): Promise<DiskUsage> {
  skipped = 0
  const total = (await inGit(root)) ? await gitUsage(root).catch(() => null) : null
  if (total) return finish(root, total)
  return finish(root, await walkUsage(root))
}

async function finish(root: string, total: { packagesMb: number; codeMb: number; mediaMb: number; otherMb: number }): Promise<DiskUsage> {
  const fs = await statfs(root).catch(() => null)
  const round = (n: number) => Math.round(n * 10) / 10
  return {
    packagesMb: round(total.packagesMb),
    codeMb: round(total.codeMb),
    mediaMb: round(total.mediaMb),
    otherMb: round(total.otherMb),
    freeMb: fs ? Math.round((fs.bavail * fs.bsize) / MB) : 0,
    skipped,
  }
}

async function walkUsage(root: string) {
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
  return total
}
