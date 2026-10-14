import { existsSync, openSync, readSync, closeSync } from 'node:fs'
import { join } from 'node:path'
import { binaryTarget, hostTarget, targetRunsOn } from '../packages/functions/src/lib/binary-target.ts'

export function resolveTarget(compileTarget: string | undefined, host = hostTarget()): string {
  return compileTarget?.replace(/^bun-/, '') ?? host
}

export function gitHint(target: string, host = hostTarget()): string {
  if (target.startsWith('darwin-')) {
    return target === host
      ? `run scripts/bundle-git-darwin.sh on this Mac (needs Homebrew git)`
      : `a macOS git can only be bundled on a ${target} Mac: run scripts/bundle-git-darwin.sh there and copy .deploy/git/${target}`
  }
  return `run scripts/build-git.sh ${target.replace('-', '/')} (needs docker)`
}

export function checkGit(root: string, target: string, host = hostTarget()): string {
  const dir = join(root, '.deploy', 'git', target)
  const bin = join(dir, 'bin', 'git')
  if (!existsSync(bin)) throw new Error(`No git for ${target} in ${dir}: ${gitHint(target, host)}`)
  const fd = openSync(bin, 'r')
  const head = new Uint8Array(32)
  readSync(fd, head, 0, 32, 0)
  closeSync(fd)
  const found = binaryTarget(head)
  if (!targetRunsOn(found, target)) {
    throw new Error(`${bin} is a ${found ?? 'unrecognised'} binary but the build targets ${target}: ${gitHint(target, host)}`)
  }
  return dir
}
