const parts = (version: string) => (version.match(/\d+/g) ?? []).map(Number)

export const compareVersions = (a: string, b: string) => {
  const x = parts(a)
  const y = parts(b)
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0)
    if (d !== 0) return d
  }
  return 0
}

const asSemver = (version: string) => {
  const [major = 0, minor = 0, patch = 0] = parts(version)
  return `${major}.${minor}.${patch}`
}

export const accepts = (version: string | null, range?: string) => {
  if (!range || range === '*') return true
  if (version === null) return false
  return Bun.semver.satisfies(asSemver(version), range)
}

export const newestFirst = <T>(items: T[], version: (item: T) => string) =>
  [...items].sort((a, b) => compareVersions(version(b), version(a)))
