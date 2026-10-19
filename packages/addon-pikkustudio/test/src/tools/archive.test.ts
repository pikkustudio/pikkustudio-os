import { describe, expect, test } from 'bun:test'
import { existsSync, readdirSync, readFileSync, readlinkSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { extractArchive } from '../../../src/lib/tools/archive.js'
import { makeTarGz, makeZip, tempDir } from './fixtures.js'

const formats = [
  ['zip', makeZip],
  ['tar.gz', makeTarGz],
] as const

describe.each(formats)('%s extraction', (format, make) => {
  const extract = async (entries: Parameters<typeof make>[0], root: string) => {
    const file = join(tempDir(), `archive.${format}`)
    writeFileSync(file, make(entries))
    await extractArchive(file, format, root)
  }

  test('unpacks files, directories, modes and inside symlinks', async () => {
    const root = tempDir()
    await extract(
      [
        { name: 'shell', dir: true },
        { name: 'shell/run', data: '#!/bin/sh\n', mode: 0o755 },
        { name: 'shell/lib/a.txt', data: 'a' },
        { name: 'shell/current', link: 'lib/a.txt' },
      ],
      root,
    )
    expect(readFileSync(join(root, 'shell/lib/a.txt'), 'utf8')).toBe('a')
    expect(statSync(join(root, 'shell/run')).mode & 0o111).not.toBe(0)
    expect(readlinkSync(join(root, 'shell/current'))).toBe('lib/a.txt')
  })

  test('refuses entries that climb out with ..', async () => {
    const root = join(tempDir(), 'target')
    await expect(extract([{ name: '../evil', data: 'x' }], root)).rejects.toThrow(/outside/)
    expect(existsSync(join(root, '..', 'evil'))).toBe(false)
  })

  test('refuses absolute entries', async () => {
    const root = tempDir()
    await expect(extract([{ name: '/tmp/evil', data: 'x' }], root)).rejects.toThrow(/outside/)
  })

  test('refuses symlinks that point outside, before writing anything', async () => {
    const root = tempDir()
    const archive = [
      { name: 'ok.txt', data: 'ok' },
      { name: 'escape', link: '../../etc/passwd' },
    ]
    await expect(extract(archive, root)).rejects.toThrow(/symlink/)
    expect(existsSync(join(root, 'ok.txt'))).toBe(false)
  })

  test('refuses absolute symlink targets', async () => {
    const root = tempDir()
    await expect(extract([{ name: 'escape', link: '/etc/passwd' }], root)).rejects.toThrow(/symlink/)
  })

  test('a truncated archive fails and leaves nothing behind', async () => {
    const root = tempDir()
    const full = make([
      { name: 'a.txt', data: 'a'.repeat(2000) },
      { name: 'b.txt', data: Array.from({ length: 400 }, (_, i) => `line ${i * 7919}`).join('\n') },
    ])
    const file = join(tempDir(), `cut.${format}`)
    writeFileSync(file, full.subarray(0, Math.floor(full.length * 0.6)))
    await expect(extractArchive(file, format, root)).rejects.toThrow()
    expect(readdirSync(root)).toEqual([])
  })
})

const large = process.env.TOOLS_LARGE_TEST ? describe : describe.skip

large('large archive memory', () => {
  const mb = 1024 * 1024
  const rssPeak = async (run: () => Promise<void>) => {
    let peak = 0
    const timer = setInterval(() => (peak = Math.max(peak, process.memoryUsage().rss)), 20)
    const before = process.memoryUsage().rss
    try {
      await run()
    } finally {
      clearInterval(timer)
    }
    return Math.max(peak, process.memoryUsage().rss) - before
  }

  test('zip of many entries extracts in bounded memory', async () => {
    const dir = tempDir()
    const file = join(dir, 'big.zip')
    const script = join(dir, 'gen.py')
    writeFileSync(
      script,
      "import zipfile,os,sys\nz=zipfile.ZipFile(sys.argv[1],'w',zipfile.ZIP_DEFLATED,compresslevel=1)\nfor i in range(24):\n    z.writestr('d/f%d.bin'%i,os.urandom(6*1024*1024))\nz.close()\n",
    )
    expect((await Bun.spawn(['python3', '-I', script, file]).exited)).toBe(0)
    const size = statSync(file).size
    const growth = await rssPeak(() => extractArchive(file, 'zip', join(dir, 'out'))).finally(() => rmSync(dir, { recursive: true, force: true }))
    console.log(`zip ${Math.round(size / mb)}MB archive, rss growth ${Math.round(growth / mb)}MB`)
    expect(growth).toBeLessThan(size / 2)
  }, 120_000)

  test('tar.gz with one big entry extracts in bounded memory', async () => {
    const dir = tempDir()
    const file = join(dir, 'big.tar.gz')
    const script = join(dir, 'gen.py')
    writeFileSync(
      script,
      "import tarfile,os,sys,io\nt=tarfile.open(sys.argv[1],'w:gz',compresslevel=1)\nb=os.urandom(160*1024*1024)\ni=tarfile.TarInfo('big.bin');i.size=len(b)\nt.addfile(i,io.BytesIO(b))\nt.close()\n",
    )
    expect((await Bun.spawn(['python3', '-I', script, file]).exited)).toBe(0)
    const size = statSync(file).size
    const growth = await rssPeak(() => extractArchive(file, 'tar.gz', join(dir, 'out'))).finally(() => rmSync(dir, { recursive: true, force: true }))
    console.log(`tar.gz ${Math.round(size / mb)}MB archive, rss growth ${Math.round(growth / mb)}MB`)
    expect(growth).toBeLessThan(size / 2)
  }, 180_000)
})
