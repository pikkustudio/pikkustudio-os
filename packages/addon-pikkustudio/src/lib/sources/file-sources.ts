import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import type { ScopedSource } from './cascade.js'

export const parseDotenv = (text: string): Record<string, string> => {
  const env: Record<string, string> = {}
  for (const line of text.split('\n')) {
    const match = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line)
    if (match) env[match[1]!] = match[2]!.trim().replace(/^["']|["']$/g, '')
  }
  return env
}

const readDotenv = (path: string) => (existsSync(path) ? parseDotenv(readFileSync(path, 'utf8')) : {})

const writeDotenv = async (path: string, values: Record<string, string>) => {
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, Object.entries(values).map(([name, value]) => `${name}=${value}`).join('\n') + '\n', { mode: 0o600 })
}

export const dotenvFileFor = (scope: string) => {
  if (scope === 'default') return '.env'
  if (scope === 'dev') return '.env.dev'
  if (scope === 'ci') return '.env.ci'
  return `.env.${scope.replace(':', '.')}`
}

export const projectSource = (projectPath: string): ScopedSource => ({
  name: 'project',
  read: async (scope) => readDotenv(join(projectPath, dotenvFileFor(scope))),
  write: async (scope, values) => writeDotenv(join(projectPath, dotenvFileFor(scope)), values),
})

export interface SealedStore {
  keys(): Promise<string[]>
  get(key: string): Promise<string | undefined>
}

export const personalKey = (projectId: string, scope: string, name: string) => `personal:${projectId}:${scope}:${name}`

export const vaultPersonalSource = (store: SealedStore, projectId: string): ScopedSource => ({
  name: 'personal',
  read: async (scope) => {
    const prefix = personalKey(projectId, scope, '')
    const out: Record<string, string> = {}
    for (const key of await store.keys()) {
      if (!key.startsWith(prefix)) continue
      const value = await store.get(key)
      if (value !== undefined) out[key.slice(prefix.length)] = value
    }
    return out
  },
})

export const generatedSource = (path: string): ScopedSource => ({
  name: 'generated',
  read: async (scope) => (scope === 'default' ? readDotenv(path) : {}),
  write: async (scope, values) => {
    if (scope !== 'default') throw new Error('Generated values only apply to every run')
    await writeDotenv(path, values)
  },
})
