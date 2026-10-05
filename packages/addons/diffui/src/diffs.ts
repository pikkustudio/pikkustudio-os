export type DiffPair = {
  screen: string
  theme: 'dark' | 'light'
  state: string
  original: string
  prototype: string
}

const FILE = /^(.+)-(dark|light)-(.+)-(original|prototype)\.png$|^(.+)-(original|prototype)\.png$/

export const pairDiffs = (files: string[]): DiffPair[] => {
  const found = new Map<string, Partial<DiffPair>>()
  for (const file of files) {
    const m = FILE.exec(file)
    if (!m) continue
    const side = (m[4] ?? m[6]) as 'original' | 'prototype'
    const key = file.slice(0, -`-${side}.png`.length)
    const theme = (m[2] ?? (/-(dark|light)(-|$)/.exec(key)?.[1] ?? 'dark')) as 'dark' | 'light'
    const entry = found.get(key) ?? {
      screen: m[1] ?? m[5] ?? key,
      theme,
      state: m[3] ?? '',
    }
    entry[side] = file
    found.set(key, entry)
  }
  return [...found.values()]
    .filter((e): e is DiffPair => !!e.original && !!e.prototype)
    .sort((a, b) =>
      `${a.screen}${a.state}${a.theme}`.localeCompare(`${b.screen}${b.state}${b.theme}`)
    )
}
