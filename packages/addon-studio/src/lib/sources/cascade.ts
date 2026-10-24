import { chainFor, type Target } from './scopes.js'

export interface ScopedSource {
  name: string
  read(scope: string): Promise<Record<string, string>>
  write?(scope: string, values: Record<string, string>): Promise<void>
}

export interface Effective {
  value: string
  scope: string
  source: string
}

export const resolveEffective = async (sources: ScopedSource[], target: Target): Promise<Record<string, Effective>> => {
  const out: Record<string, Effective> = {}
  for (const scope of chainFor(target)) {
    const claimed = new Set<string>()
    for (const source of sources) {
      const values = await source.read(scope)
      for (const [name, value] of Object.entries(values)) {
        if (claimed.has(name)) continue
        claimed.add(name)
        out[name] = { value, scope, source: source.name }
      }
    }
  }
  return out
}

export const toEnv = (effective: Record<string, Effective>) =>
  Object.fromEntries(Object.entries(effective).map(([name, e]) => [name, e.value]))

export const setIn = async (source: ScopedSource, scope: string, name: string, value: string) => {
  if (!source.write) throw new Error(`The ${source.name} source is read only`)
  await source.write(scope, { ...(await source.read(scope)), [name]: value })
}

export const unsetIn = async (source: ScopedSource, scope: string, name: string) => {
  if (!source.write) throw new Error(`The ${source.name} source is read only`)
  const { [name]: _, ...rest } = await source.read(scope)
  await source.write(scope, rest)
}

export const setMany = async (source: ScopedSource, scope: string, values: Record<string, string>) => {
  if (!source.write) throw new Error(`The ${source.name} source is read only`)
  await source.write(scope, { ...(await source.read(scope)), ...values })
}
