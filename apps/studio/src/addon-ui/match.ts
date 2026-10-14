export type ScreenPattern = { path: string }

export type ScreenMatch<S extends ScreenPattern> = {
  screen: S
  params: Record<string, string>
}

const segments = (path: string) => path.split('/').filter(Boolean)

const matchOne = (pattern: string, subpath: string[]): Record<string, string> | null => {
  const parts = segments(pattern)
  if (parts.length !== subpath.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!
    const value = subpath[i]!
    if (part.startsWith(':')) params[part.slice(1)] = decodeURIComponent(value)
    else if (part !== value) return null
  }
  return params
}

export const matchScreen = <S extends ScreenPattern>(screens: readonly S[], subpath: string): ScreenMatch<S> | null => {
  const wanted = segments(subpath)
  const ranked = [...screens].sort((a, b) => Number(a.path.includes(':')) - Number(b.path.includes(':')))
  for (const screen of ranked) {
    const params = matchOne(screen.path, wanted)
    if (params) return { screen, params }
  }
  return null
}

export const splitAddonPath = (splat: string) => {
  const [name = '', ...rest] = segments(splat)
  return { name, subpath: `/${rest.join('/')}` }
}
