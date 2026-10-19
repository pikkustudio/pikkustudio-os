import { existsSync, openSync, readSync, closeSync } from 'node:fs'
import { join } from 'node:path'
import { binaryTarget, hostTarget, targetRunsOn } from '../packages/functions/src/lib/binary-target.ts'

export function resolveTarget(compileTarget: string | undefined, host = hostTarget()): string {
  return compileTarget?.replace(/^bun-/, '') ?? host
}

export function gitHint(target: string): string {
  return `run scripts/fetch-git.sh ${target.replace('-', '/')}`
}

export function checkGit(root: string, target: string): string {
  const dir = join(root, '.deploy', 'git', target)
  const bin = join(dir, 'bin', 'git')
  if (!existsSync(bin)) throw new Error(`No git for ${target} in ${dir}: ${gitHint(target)}`)
  const fd = openSync(bin, 'r')
  const head = new Uint8Array(32)
  readSync(fd, head, 0, 32, 0)
  closeSync(fd)
  const found = binaryTarget(head)
  if (!targetRunsOn(found, target)) {
    throw new Error(`${bin} is a ${found ?? 'unrecognised'} binary but the build targets ${target}: ${gitHint(target)}`)
  }
  return dir
}
