import { describe, expect, test } from 'bun:test'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { checkGit, resolveTarget } from './runtime-target.ts'

const withGit = (target: string, head: number[]) => {
  const root = mkdtempSync(join(tmpdir(), 'rt-'))
  mkdirSync(join(root, '.deploy', 'git', target, 'bin'), { recursive: true })
  const b = new Uint8Array(32)
  b.set(head)
  writeFileSync(join(root, '.deploy', 'git', target, 'bin', 'git'), b)
  return root
}

describe('runtime target', () => {
  test('compile target wins over host', () => {
    expect(resolveTarget('bun-linux-x64', 'darwin-arm64')).toBe('linux-x64')
    expect(resolveTarget(undefined, 'darwin-arm64')).toBe('darwin-arm64')
  })
  test('missing git fails with a hint', () => {
    const root = mkdtempSync(join(tmpdir(), 'rt-'))
    expect(() => checkGit(root, 'darwin-arm64', 'darwin-arm64')).toThrow('bundle-git-darwin.sh')
    expect(() => checkGit(root, 'linux-x64', 'darwin-arm64')).toThrow('build-git.sh linux/x64')
  })
  test('a Linux git for a darwin target is rejected', () => {
    const root = withGit('darwin-arm64', [0x7f, 0x45, 0x4c, 0x46, 2, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0xb7, 0])
    expect(() => checkGit(root, 'darwin-arm64', 'darwin-arm64')).toThrow('linux-arm64 binary')
  })
  test('a matching git is accepted', () => {
    const root = withGit('darwin-arm64', [0xcf, 0xfa, 0xed, 0xfe, 0x0c, 0, 0, 0x01])
    expect(checkGit(root, 'darwin-arm64', 'darwin-arm64')).toContain('darwin-arm64')
  })
})
