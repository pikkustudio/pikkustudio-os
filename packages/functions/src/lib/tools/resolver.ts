import { delimiter, dirname, join } from 'node:path'
import { findOnMachine, type Found } from './find.js'
import { dirSize, installArtifact, installedVersions, removeVersion } from './install.js'
import {
  appliesTo,
  bakedManifest,
  currentPlatform,
  type GetHints,
  type Manifest,
  type Platform,
  type ToolEntry,
  type ToolVersion,
} from './manifest.js'
import { accepts, newestFirst } from './versions.js'

export interface Need {
  tool: string
  version?: string
  requestedBy: string
}

export interface Resolved {
  status: 'found' | 'installed'
  tool: string
  version: string | null
  path: string
  bins: string[]
  env: Record<string, string>
}

export interface NeedsAnswer {
  status: 'needs'
  tool: string
  name: string
  version: string | null
  size: number | null
  requestedBy: string
  get: GetHints
  canInstall: boolean
}

export type Resolution = Resolved | NeedsAnswer

export interface ToolStatus {
  id: string
  name: string
  status: 'found' | 'installed' | 'missing' | 'unavailable'
  version: string | null
  path: string | null
  size: number | null
  canInstall: boolean
  installed: Array<{ version: string; path: string; size: number }>
  get: GetHints
}

export interface ToolResolverOptions {
  home: string
  manifest?: Manifest
  platform?: Platform | null
  searchPath?: string
  coreBin?: string[]
  autoInstall?: string[]
}

export class ToolResolver {
  private manifest: Manifest
  private platform: Platform | null
  private found = new Map<string, Promise<Found | null>>()
  private installing = new Map<string, Promise<string>>()

  constructor(private options: ToolResolverOptions) {
    this.manifest = options.manifest ?? bakedManifest
    this.platform = options.platform === undefined ? currentPlatform() : options.platform
  }

  private searchPath() {
    return this.options.searchPath ?? process.env.PATH ?? ''
  }

  entries() {
    return this.manifest.tools.filter((tool) => appliesTo(tool, this.platform))
  }

  entry(id: string) {
    const tool = this.entries().find((tool) => tool.id === id)
    if (!tool) throw new Error(`Unknown tool: ${id}`)
    return tool
  }

  private artifact(version: ToolVersion | undefined) {
    return version && this.platform ? (version.artifacts[this.platform] ?? null) : null
  }

  private find(tool: ToolEntry) {
    if (!this.found.has(tool.id)) this.found.set(tool.id, findOnMachine(tool.find, this.searchPath()))
    return this.found.get(tool.id)!
  }

  checkAgain() {
    this.found.clear()
  }

  private candidate(tool: ToolEntry, range?: string) {
    const accepted = tool.versions.filter((version) => accepts(version.version, range))
    return accepted.find((version) => version.default) ?? newestFirst(accepted, (version) => version.version)[0]
  }

  private env(tool: ToolEntry, values: { bin?: string; dir?: string }) {
    const vars: Record<string, string> = { home: this.options.home, bin: values.bin ?? '', dir: values.dir ?? '' }
    return Object.fromEntries(
      Object.entries(tool.env).map(([key, value]) => [key, value.replace(/\$\{(\w+)\}/g, (_, name) => vars[name] ?? '')]),
    )
  }

  private async installedMatch(tool: ToolEntry, range?: string) {
    const installed = (await installedVersions(this.options.home, tool.id)).filter((item) => accepts(item.version, range))
    for (const item of newestFirst(installed, (item) => item.version)) {
      const artifact = this.artifact(tool.versions.find((version) => version.version === item.version))
      if (artifact) return { ...item, bins: artifact.bin.map((bin) => join(item.dir, bin)) }
    }
    return null
  }

  async resolve(need: Need): Promise<Resolution> {
    const tool = this.entry(need.tool)
    const found = await this.find(tool)
    if (found && accepts(found.version, need.version)) {
      const bins = tool.find.command && found.path !== tool.find.endpoint ? [found.path] : []
      return {
        status: 'found',
        tool: tool.id,
        version: found.version,
        path: found.path,
        bins,
        env: this.env(tool, { bin: bins[0] }),
      }
    }
    const installed = await this.installedMatch(tool, need.version)
    if (installed) {
      return {
        status: 'installed',
        tool: tool.id,
        version: installed.version,
        path: installed.dir,
        bins: installed.bins,
        env: this.env(tool, { bin: installed.bins[0], dir: installed.dir }),
      }
    }
    const candidate = this.candidate(tool, need.version)
    const artifact = this.artifact(candidate)
    return {
      status: 'needs',
      tool: tool.id,
      name: tool.name,
      version: candidate?.version ?? need.version ?? null,
      size: artifact?.size ?? null,
      requestedBy: need.requestedBy,
      get: tool.get,
      canInstall: artifact !== null,
    }
  }

  async childEnv(needs: Need[]) {
    const resolutions = await Promise.all(needs.map((need) => this.resolve(need)))
    const env: Record<string, string> = {}
    const dirs: string[] = []
    for (const resolution of resolutions) {
      if (resolution.status === 'needs') continue
      Object.assign(env, resolution.env)
      dirs.push(...resolution.bins.map((bin) => dirname(bin)))
    }
    dirs.push(...(this.options.coreBin ?? []), ...(process.env.PATH ?? '').split(delimiter))
    env.PATH = [...new Set(dirs.filter(Boolean))].join(delimiter)
    return { env, needs: resolutions.filter((resolution) => resolution.status === 'needs') }
  }

  async install(id: string, version?: string, onProgress?: (received: number, total: number | null) => void) {
    const tool = this.entry(id)
    const chosen = version ? tool.versions.find((item) => item.version === version) : this.candidate(tool)
    if (!chosen) throw new Error(`${tool.name} has no version ${version ?? ''} to install`.trim())
    const artifact = this.artifact(chosen)
    if (!artifact) throw new Error(`${tool.name} ${chosen.version} is not available on this machine`)
    const key = `${tool.id}@${chosen.version}`
    if (!this.installing.has(key)) {
      this.installing.set(
        key,
        installArtifact(this.options.home, tool.id, chosen.version, artifact, onProgress).finally(() =>
          this.installing.delete(key),
        ),
      )
    }
    return { tool: tool.id, version: chosen.version, path: await this.installing.get(key)! }
  }

  async remove(id: string, version: string) {
    const tool = this.entry(id)
    const installed = await installedVersions(this.options.home, tool.id)
    if (!installed.some((item) => item.version === version)) throw new Error(`${tool.name} ${version} is not installed`)
    await removeVersion(this.options.home, tool.id, version)
  }

  async ensure(needs: Need[]) {
    const allowed = new Set(this.options.autoInstall ?? [])
    return Promise.all(
      needs.map(async (need) => {
        const resolution = await this.resolve(need)
        if (resolution.status !== 'needs' || !resolution.canInstall || !allowed.has(need.tool)) return resolution
        await this.install(need.tool, resolution.version ?? undefined)
        return this.resolve(need)
      }),
    )
  }

  async status(tool: ToolEntry): Promise<ToolStatus> {
    const installed = await Promise.all(
      newestFirst(await installedVersions(this.options.home, tool.id), (item) => item.version).map(async (item) => ({
        version: item.version,
        path: item.dir,
        size: await dirSize(item.dir),
      })),
    )
    const resolution = await this.resolve({ tool: tool.id, requestedBy: 'tools' })
    const base = { id: tool.id, name: tool.name, installed, get: tool.get }
    if (resolution.status === 'needs') {
      return {
        ...base,
        status: resolution.canInstall || tool.versions.length === 0 ? 'missing' : 'unavailable',
        version: resolution.version,
        path: null,
        size: resolution.size,
        canInstall: resolution.canInstall,
      }
    }
    return {
      ...base,
      status: resolution.status,
      version: resolution.version,
      path: resolution.path,
      size: installed.find((item) => item.path === resolution.path)?.size ?? null,
      canInstall: false,
    }
  }

  list() {
    return Promise.all(this.entries().map((tool) => this.status(tool)))
  }
}
