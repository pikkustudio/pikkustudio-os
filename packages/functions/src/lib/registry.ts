import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'

const registryBase = () => (process.env.FABRIC_API_URL ?? 'https://api.pikkustudio.app').replace(/\/+$/, '')

export interface OpenApiEntry {
  name: string
  version: string
  provider: string
  title: string
  description: string
  swaggerUrl: string
  securitySchemes?: string[]
  servers?: string[]
  totalOperations?: number
}

export interface PackageEntry {
  name: string
  version: string
  description: string
  displayName?: string
  author?: string
  tags?: string[]
}

export interface PackageDetail extends PackageEntry {
  functions?: Record<string, unknown>
  secrets?: Record<string, { secretId?: string }>
  credentials?: Record<string, { name?: string; displayName?: string; description?: string }>
  variables?: Record<string, unknown>
}

async function get<T>(path: string): Promise<T | null> {
  const response = await fetch(`${registryBase()}${path}`)
  if (response.status === 404) return null
  if (!response.ok) throw new Error(`Registry GET ${path} failed: ${response.status} ${await response.text()}`)
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : null
}

export async function searchPackages(query: string): Promise<PackageEntry[]> {
  return (await get<PackageEntry[]>(`/registry/addons/search?${new URLSearchParams({ query })}`)) ?? []
}

export async function searchOpenApis(query: string, limit = 20): Promise<OpenApiEntry[]> {
  const params = new URLSearchParams({ limit: String(limit), offset: '0' })
  if (query) params.set('query', query)
  return (await get<{ apis: OpenApiEntry[] }>(`/registry/openapis?${params}`))?.apis ?? []
}

export async function getOpenApi(name: string): Promise<OpenApiEntry | null> {
  return get<OpenApiEntry>(`/registry/openapis/${encodeURIComponent(name)}`)
}

export async function getPackage(name: string): Promise<PackageDetail | null> {
  const bare = name
    .replace(/^@pikku\//, '')
    .replace(/^(pikku-)?addon-/, '')
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
  if (!bare) return null
  return get<PackageDetail>(`/registry/addons/${encodeURIComponent(`pikku-addon-${bare}`)}`)
}

export async function functionsDir(projectDir: string): Promise<string> {
  const nested = join(projectDir, 'packages', 'functions')
  return existsSync(join(nested, 'package.json')) ? nested : projectDir
}

export async function declaredDependency(dir: string, name: string): Promise<boolean> {
  const pkg = JSON.parse(await readFile(join(dir, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>
  }
  return Boolean(pkg.dependencies?.[name])
}

export async function addDependency(dir: string, spec: string): Promise<{ ok: boolean; output: string }> {
  const child = Bun.spawn([process.execPath, 'add', spec], {
    cwd: dir,
    env: { ...process.env, BUN_BE_BUN: '1' },
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
  })
  const [out, err, code] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])
  return { ok: code === 0, output: `${out}${err}`.trim() }
}
