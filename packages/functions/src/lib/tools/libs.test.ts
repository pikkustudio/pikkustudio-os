import { describe, expect, test } from 'bun:test'
import { missingLibs, parseMissing } from './libs.js'

describe('parseMissing', () => {
  test('lists each missing library once', () => {
    const ldd = [
      '\tlinux-vdso.so.1 (0x0000ffff)',
      '\tlibglib-2.0.so.0 => not found',
      '\tlibnss3.so => not found',
      '\tlibc.so.6 => /lib/aarch64-linux-gnu/libc.so.6 (0x0000ffff)',
      '\tlibglib-2.0.so.0 => not found',
    ].join('\n')
    expect(parseMissing(ldd)).toEqual(['libglib-2.0.so.0', 'libnss3.so'])
  })

  test('nothing missing', () => {
    expect(parseMissing('\tlibc.so.6 => /lib/libc.so.6 (0x1)')).toEqual([])
  })

  test('skips the check off Linux', async () => {
    expect(await missingLibs('/nowhere', 'darwin')).toEqual([])
  })
})
