import { describe, expect, test } from 'bun:test'
import { existsSync, readFileSync, readlinkSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { extractArchive } from './archive.js'
import { makeTarGz, makeZip, tempDir } from './fixtures.js'

const formats = [
  ['zip', makeZip],
  ['tar.gz', makeTarGz],
] as const

describe.each(formats)('%s extraction', (format, make) => {
  test('unpacks files, directories, modes and inside symlinks', async () => {
    const root = tempDir()
    await extractArchive(
      make([
        { name: 'shell', dir: true },
        { name: 'shell/run', data: '#!/bin/sh\n', mode: 0o755 },
        { name: 'shell/lib/a.txt', data: 'a' },
        { name: 'shell/current', link: 'lib/a.txt' },
      ]),
      format,
      root,
    )
    expect(readFileSync(join(root, 'shell/lib/a.txt'), 'utf8')).toBe('a')
    expect(statSync(join(root, 'shell/run')).mode & 0o111).not.toBe(0)
    expect(readlinkSync(join(root, 'shell/current'))).toBe('lib/a.txt')
  })

  test('refuses entries that climb out with ..', async () => {
    const root = join(tempDir(), 'target')
    await expect(extractArchive(make([{ name: '../evil', data: 'x' }]), format, root)).rejects.toThrow(/outside/)
    expect(existsSync(join(root, '..', 'evil'))).toBe(false)
  })

  test('refuses absolute entries', async () => {
    const root = tempDir()
    await expect(extractArchive(make([{ name: '/tmp/evil', data: 'x' }]), format, root)).rejects.toThrow(/outside/)
  })

  test('refuses symlinks that point outside, before writing anything', async () => {
    const root = tempDir()
    const archive = make([
      { name: 'ok.txt', data: 'ok' },
      { name: 'escape', link: '../../etc/passwd' },
    ])
    await expect(extractArchive(archive, format, root)).rejects.toThrow(/symlink/)
    expect(existsSync(join(root, 'ok.txt'))).toBe(false)
  })

  test('refuses absolute symlink targets', async () => {
    const root = tempDir()
    await expect(extractArchive(make([{ name: 'escape', link: '/etc/passwd' }]), format, root)).rejects.toThrow(/symlink/)
  })
})
