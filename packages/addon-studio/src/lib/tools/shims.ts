import { existsSync, readdirSync } from 'node:fs'
import { chmod, mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { basename, delimiter, dirname, join } from 'node:path'

const MARK = '# pikku-studio-tool-shim'

const quote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`

const atomic = async (file: string, content: string, mode: number) => {
  const temp = `${file}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`
  await writeFile(temp, content, { mode })
  await chmod(temp, mode)
  await rename(temp, file)
}

export interface ShimInput {
  home: string
  shimsDirs: string[]
  coreBin: string[]
  resolved: Array<{ bins: string[]; env: Record<string, string> }>
}

export const envFile = (home: string) => join(home, 'tools', 'env.sh')

export async function syncShims({ home, shimsDirs, coreBin, resolved }: ShimInput) {
  const env: Record<string, string> = {}
  const dirs: string[] = []
  const targets = new Map<string, string>()
  const core = new Set(coreBin.flatMap((dir) => (existsSync(dir) ? readdirSync(dir) : [])))
  for (const item of resolved) {
    Object.assign(env, item.env)
    for (const bin of item.bins) {
      dirs.push(dirname(bin))
      const name = basename(bin)
      if (name === 'pikku' || core.has(name) || targets.has(name)) continue
      targets.set(name, bin)
    }
  }
  const file = envFile(home)
  await mkdir(dirname(file), { recursive: true })
  const lines = ['#!/bin/sh', ...Object.entries(env).filter(([key]) => key !== 'PATH').map(([key, value]) => `export ${key}=${quote(value)}`)]
  const unique = [...new Set(dirs)]
  if (unique.length) lines.push(`export PATH=${quote(unique.join(delimiter))}:"$PATH"`)
  await atomic(file, `${lines.join('\n')}\n`, 0o644)

  for (const dir of shimsDirs) {
    await mkdir(dir, { recursive: true })
    const existing = await readdir(dir)
    const ours = new Set<string>()
    for (const name of existing) {
      const content = await readFile(join(dir, name), 'utf8').catch(() => '')
      if (content.includes(MARK)) ours.add(name)
    }
    for (const name of ours) if (!targets.has(name)) await rm(join(dir, name), { force: true })
    for (const [name, bin] of targets) {
      if (existing.includes(name) && !ours.has(name)) continue
      await atomic(join(dir, name), `#!/bin/sh\n${MARK}\n. ${quote(file)}; exec ${quote(bin)} "$@"\n`, 0o755)
    }
  }
}
