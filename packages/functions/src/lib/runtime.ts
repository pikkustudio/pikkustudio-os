import { createHash } from 'node:crypto'
import { existsSync, openSync, readSync, closeSync } from 'node:fs'
import { chmod, mkdir, readFile, rename, rm, symlink, writeFile } from 'node:fs/promises'
import { delimiter, join } from 'node:path'
import { binaryTarget, hostTarget, targetRunsOn } from './binary-target.js'

const EMBEDDED_RUNTIME = 'PIKKU_EMBEDDED_STUDIO_RUNTIME'

const shims = (self: string, dir: string): Record<string, string> => {
  const bun = `BUN_BE_BUN=1 exec "${self}"`
  return {
    bun: `${bun} "$@"`,
    node: `${bun} "$@"`,
    npx: `while [ "$1" = "--no" ] || [ "$1" = "--yes" ] || [ "$1" = "-y" ]; do shift; done\n${bun} x "$@"`,
    pi: `${bun} "${join(dir, 'pi', 'dist', 'bundle', 'cli.js')}" "$@"`,
  }
}

const GIT_LINKS: Record<string, string> = {
  'git-remote-https': 'git-remote-http',
  'git-upload-pack': '../../bin/git',
  'git-receive-pack': '../../bin/git',
  'git-upload-archive': '../../bin/git',
}

async function prepareGit(git: string) {
  await chmod(join(git, 'bin', 'git'), 0o755)
  await chmod(join(git, 'libexec', 'git-core', 'git-remote-http'), 0o755)
  for (const [name, target] of Object.entries(GIT_LINKS)) {
    await symlink(target, join(git, 'libexec', 'git-core', name))
  }
}

export function embeddedGitProblem(gitBin: string, host = hostTarget()): string | null {
  const fd = openSync(gitBin, 'r')
  const head = new Uint8Array(32)
  try {
    readSync(fd, head, 0, 32, 0)
  } finally {
    closeSync(fd)
  }
  const found = binaryTarget(head)
  if (targetRunsOn(found, host)) return null
  return `the embedded git is a ${found ?? 'unrecognised'} binary but this machine is ${host}; using the git on PATH instead (rebuild Studio for ${host})`
}

export async function installEmbeddedRuntime(home: string): Promise<string | null> {
  const archive = process.env[EMBEDDED_RUNTIME]
  if (!archive) return null
  const bytes = await readFile(archive)
  const dir = join(home, 'runtime', createHash('sha256').update(bytes).digest('hex').slice(0, 16))
  if (!existsSync(dir)) {
    const staging = `${dir}.${process.pid}`
    await rm(staging, { recursive: true, force: true })
    await mkdir(staging, { recursive: true })
    await new Bun.Archive(bytes).extract(staging)
    if (existsSync(join(staging, 'git'))) await prepareGit(join(staging, 'git'))
    for (const name of ['uv', 'uvx']) {
      const path = join(staging, 'uv', 'bin', name)
      if (existsSync(path)) await chmod(path, 0o755)
    }
    await rename(staging, dir).catch(async (error) => {
      if (!existsSync(dir)) throw error
      await rm(staging, { recursive: true, force: true })
    })
  }
  process.env.PIKKU_STUDIO_RUNTIME_DIR = dir
  const bin = join(dir, 'bin')
  await mkdir(bin, { recursive: true })
  for (const [name, body] of Object.entries(shims(process.execPath, dir))) {
    await writeFile(join(bin, name), `#!/bin/sh\n${body}\n`)
    await chmod(join(bin, name), 0o755)
  }
  const git = join(dir, 'git')
  let gitBin = existsSync(join(git, 'bin', 'git')) ? join(git, 'bin') : null
  if (gitBin) {
    const problem = embeddedGitProblem(join(gitBin, 'git'))
    if (problem) {
      console.warn(`[studio] ${problem}`)
      gitBin = null
    }
  }
  const uvBin = existsSync(join(dir, 'uv', 'bin')) ? join(dir, 'uv', 'bin') : null
  process.env.PATH = [bin, gitBin, uvBin, process.env.PATH].filter(Boolean).join(delimiter)
  if (uvBin) {
    process.env.UV_CACHE_DIR ??= join(home, 'uv', 'cache')
    process.env.UV_PYTHON_INSTALL_DIR ??= join(home, 'uv', 'python')
    process.env.UV_TOOL_DIR ??= join(home, 'uv', 'tools')
    process.env.UV_TOOL_BIN_DIR ??= join(home, 'uv', 'bin')
  }
  if (gitBin) {
    process.env.GIT_EXEC_PATH ??= join(git, 'libexec', 'git-core')
    process.env.GIT_TEMPLATE_DIR ??= join(git, 'share', 'git-core', 'templates')
  }
  if (gitBin && !process.env.GIT_SSL_CAINFO && !existsSync('/etc/ssl/certs/ca-certificates.crt')) {
    process.env.GIT_SSL_CAINFO = join(git, 'etc', 'ca-certificates.crt')
  }
  process.env.BUN_BE_BUN = '1'
  process.env.PIKKU_PI_ROOT = join(dir, 'pi')
  process.env.PIKKU_BUILDER_EXTENSIONS = join(dir, 'extensions')
  return dir
}
