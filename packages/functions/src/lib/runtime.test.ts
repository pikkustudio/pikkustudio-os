import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { binaryTarget, targetRunsOn } from './binary-target.js'
import { embeddedGitProblem } from './runtime.js'

const elf = (machine: number) => {
  const b = new Uint8Array(32)
  b.set([0x7f, 0x45, 0x4c, 0x46, 2, 1])
  new DataView(b.buffer).setUint16(18, machine, true)
  return b
}
const macho = (cpu: number) => {
  const b = new Uint8Array(32)
  b.set([0xcf, 0xfa, 0xed, 0xfe])
  new DataView(b.buffer).setUint32(4, cpu, true)
  return b
}

describe('binaryTarget', () => {
  test('recognises each platform', () => {
    expect(binaryTarget(elf(0xb7))).toBe('linux-arm64')
    expect(binaryTarget(elf(0x3e))).toBe('linux-x64')
    expect(binaryTarget(macho(0x0100000c))).toBe('darwin-arm64')
    expect(binaryTarget(macho(0x01000007))).toBe('darwin-x64')
    expect(binaryTarget(new Uint8Array(32))).toBeNull()
  })
  test('targetRunsOn matches exactly', () => {
    expect(targetRunsOn('linux-arm64', 'darwin-arm64')).toBe(false)
    expect(targetRunsOn('darwin-arm64', 'darwin-arm64')).toBe(true)
    expect(targetRunsOn('darwin-arm64', 'darwin-x64')).toBe(false)
    expect(targetRunsOn(null, 'linux-x64')).toBe(false)
  })
})

describe('embeddedGitProblem', () => {
  const write = (bytes: Uint8Array) => {
    const path = join(mkdtempSync(join(tmpdir(), 'git-')), 'git')
    writeFileSync(path, bytes)
    return path
  }
  test('a Linux git on macOS is reported', () => {
    expect(embeddedGitProblem(write(elf(0xb7)), 'darwin-arm64')).toContain('linux-arm64')
  })
  test('a matching git is accepted', () => {
    expect(embeddedGitProblem(write(macho(0x0100000c)), 'darwin-arm64')).toBeNull()
  })
})
