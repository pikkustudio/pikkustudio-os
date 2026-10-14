import { execFile } from 'node:child_process'

export const parseMissing = (ldd: string) =>
  [...ldd.matchAll(/^\s*(\S+)\s+=>\s+not found/gm)].map((match) => match[1]!).filter((lib, i, all) => all.indexOf(lib) === i)

export const missingLibs = (bin: string, platform = process.platform): Promise<string[]> =>
  platform !== 'linux'
    ? Promise.resolve([])
    : new Promise((resolve) => execFile('ldd', [bin], (_, stdout) => resolve(parseMissing(stdout ?? ''))))
