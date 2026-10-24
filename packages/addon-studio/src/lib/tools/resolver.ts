import { delimiter, dirname, join } from 'node:path'
import { findOnMachine, type Found } from './find.js'
import { dirSize, installArtifact, installedVersions, removeVersion } from './install.js'
import {
  appliesTo,
  bakedManifest,
  currentPlatform,
  type GetHints,
  type Manifest,
  parseRequirement,
  type Platform,
  type ToolEntry,
  type ToolVersion,
} from './manifest.js'
import { declaredTools, declareTool } from './project.js'
import { syncShims } from './shims.js'
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

export interface ToolRequirement {
  tool: string
  name: string
  version: string | null
  met: boolean
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
  requires: ToolRequirement[]
  declared: boolean
  get: GetHints
}

export interface ToolResolverOptions {
  home: string
  manifest?: Manifest
  platform?: Platform | null
  searchPath?: string
  coreBin?: string[] | (() => string[])
  shimsDirs?: string[]
  autoInstall?: string[]
  projectDir?: () => string | undefined
  onDeclared?: (message: string) => void
  env?: Record<string, string | undefined>
}

export class ToolResolver {
  private manifest: Manifest
  private platform: Platform | null
  private found = new Map<string, Promise<Found[]>>()
  private installing = new Map<string, Promise<string>>()

  constructor(private options: ToolResolverOptions) {
    this.manifest = options.manifest ?? bakedManifest
    this.platform = options.platform === undefined ? currentPlatform() : options.platform
  }

  private coreBin() {
    const bins = this.options.coreBin
    return typeof bins === 'function' ? bins() : (bins ?? [])
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
    if (!this.found.has(tool.id)) {
      this.found.set(
        tool.id,
        findOnMachine(tool.find, { searchPath: this.searchPath(), platform: this.platform, env: this.options.env ?? process.env }),
      )
    }
    return this.found.get(tool.id)!
  }

  checkAgain() {
    this.found.clear()
  }

  private candidate(tool: ToolEntry, range?: string) {
    const accepted = tool.versions.filter((version) => accepts(version.version, range))
    return accepted.find((version) => version.default) ?? newestFirst(accepted, (version) => version.version)[0]
  }

  private hints(tool: ToolEntry): GetHints {
    const { platforms, ...common } = tool.get
    return { ...common, ...(this.platform ? platforms?.[this.platform] : undefined) }
  }

  private env(tool: ToolEntry, values: { bin?: string; dir?: string; root?: string }) {
    const vars: Record<string, string> = {
      home: this.options.home,
      bin: values.bin ?? '',
      dir: values.dir ?? '',
      root: values.root ?? values.dir ?? '',
    }
    return Object.fromEntries(
      Object.entries(tool.env).map(([key, value]) => [key, value.replace(/\$\{(\w+)\}/g, (_, name) => vars[name] ?? '')]),
    )
  }

  private async installedMatch(tool: ToolEntry, range?: string) {
    const installed = (await installedVersions(this.options.home, tool.id)).filter((item) => accepts(item.version, range))
    for (const item of newestFirst(installed, (item) => item.version)) {
      const artifact = this.artifact(tool.versions.find((version) => version.version === item.version))
      if (artifact) {
        return { ...item, root: join(item.dir, artifact.root ?? ''), bins: artifact.bin.map((bin) => join(item.dir, bin)) }
      }
    }
    return null
  }

  private cycle(id: string, chain: string[]) {
    if (chain.includes(id)) throw new Error(`Tool dependency cycle: ${[...chain, id].join(' -> ')}`)
  }

  private async resolveOwn(need: Need): Promise<Resolution> {
    const tool = this.entry(need.tool)
    const found = (await this.find(tool)).find((item) => accepts(item.version, need.version))
    if (found) {
      const bins = found.bins ?? (tool.find.command && found.path !== tool.find.endpoint ? [found.path] : [])
      return {
        status: 'found',
        tool: tool.id,
        version: found.version,
        path: found.path,
        bins,
        env: this.env(tool, { bin: bins[0], root: found.root }),
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
        env: this.env(tool, { bin: installed.bins[0], dir: installed.dir, root: installed.root }),
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
      get: this.hints(tool),
      canInstall: artifact !== null,
    }
  }

  async resolve(need: Need, chain: string[] = []): Promise<Resolution> {
    const tool = this.entry(need.tool)
    this.cycle(tool.id, chain)
    const dependencies: Resolved[] = []
    for (const requirement of tool.requires ?? []) {
      const { tool: id, version } = parseRequirement(requirement)
      const dependency = await this.resolve({ tool: id, version, requestedBy: tool.id }, [...chain, tool.id])
      if (dependency.status === 'needs') return dependency
      dependencies.push(dependency)
    }
    const own = await this.resolveOwn(need)
    if (own.status === 'needs' || dependencies.length === 0) return own
    return {
      ...own,
      bins: [...own.bins, ...dependencies.flatMap((dependency) => dependency.bins)],
      env: Object.assign({}, ...dependencies.map((dependency) => dependency.env), own.env),
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
    dirs.push(...this.coreBin(), ...(process.env.PATH ?? '').split(delimiter))
    env.PATH = [...new Set(dirs.filter(Boolean))].join(delimiter)
    return { env, needs: resolutions.filter((resolution) => resolution.status === 'needs') }
  }

  async install(id: string, version?: string, onProgress?: (received: number, total: number | null) => void) {
    const installed = await this.installChain(id, version, onProgress, [])
    declareTool(this.options.projectDir?.(), version ? { id: installed.tool, version } : { id: installed.tool })
    await this.syncShims()
    return installed
  }

  declared() {
    return declaredTools(this.options.projectDir?.())
  }

  async ensureDeclared() {
    const log = this.options.onDeclared ?? (() => {})
    const allowed = new Set(this.options.autoInstall ?? [])
    await Promise.all(
      this.declared().map(async (item) => {
        try {
          const [resolution] = await this.ensure([{ tool: item.id, version: item.version, requestedBy: 'project' }])
          if (resolution.status !== 'needs') log(`tool ${item.id} ready (${resolution.status} ${resolution.version ?? ''})`.trim())
          else if (!allowed.has(item.id)) log(`tool ${item.id} needed by the project, not in the auto-install list`)
          else log(`tool ${item.id} still needed${resolution.canInstall ? '' : ', Studio cannot install it here'}`)
        } catch (error) {
          log(`tool ${item.id} failed: ${error instanceof Error ? error.message : error}`)
        }
      }),
    )
    await this.syncShims()
  }

  private pending: Promise<unknown> = Promise.resolve()

  syncShims() {
    const dirs = this.options.shimsDirs
    if (!dirs?.length) return Promise.resolve()
    const run = async () => {
      const resolved: Resolved[] = []
      for (const tool of this.entries()) {
        try {
          const resolution = await this.resolve({ tool: tool.id, requestedBy: 'shims' })
          if (resolution.status !== 'needs') resolved.push(resolution)
        } catch {}
      }
      await syncShims({ home: this.options.home, shimsDirs: dirs, coreBin: this.coreBin(), resolved })
    }
    this.pending = this.pending.then(run, run)
    return (this.pending as Promise<void>).catch(() => {})
  }

  private async installChain(
    id: string,
    version: string | undefined,
    onProgress: ((received: number, total: number | null) => void) | undefined,
    chain: string[],
  ): Promise<{ tool: string; version: string; path: string }> {
    const tool = this.entry(id)
    this.cycle(tool.id, chain)
    for (const requirement of tool.requires ?? []) {
      const { tool: dependency, version: range } = parseRequirement(requirement)
      const attempted = new Set<string>()
      for (;;) {
        const resolution = await this.resolve({ tool: dependency, version: range, requestedBy: tool.id }, [...chain, tool.id])
        if (resolution.status !== 'needs') break
        const key = `${resolution.tool}@${resolution.version}`
        if (!resolution.canInstall || attempted.has(key)) {
          throw new Error(`${resolution.name} is required by ${tool.name} and Studio cannot install it on this machine`)
        }
        attempted.add(key)
        await this.installChain(resolution.tool, resolution.version ?? undefined, undefined, [...chain, tool.id])
      }
    }
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
    this.checkAgain()
    await this.syncShims()
  }

  async ensure(needs: Need[]) {
    const allowed = new Set(this.options.autoInstall ?? [])
    return Promise.all(
      needs.map(async (need) => {
        const attempted = new Set<string>()
        for (;;) {
          const resolution = await this.resolve(need)
          if (resolution.status !== 'needs' || !resolution.canInstall || !allowed.has(resolution.tool)) return resolution
          const key = `${resolution.tool}@${resolution.version}`
          if (attempted.has(key)) return resolution
          attempted.add(key)
          await this.installChain(resolution.tool, resolution.version ?? undefined, undefined, [])
          await this.syncShims()
        }
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
    const resolution = await this.resolveOwn({ tool: tool.id, requestedBy: 'tools' })
    const requires = await Promise.all(
      (tool.requires ?? []).map(async (requirement) => {
        const { tool: id, version } = parseRequirement(requirement)
        const name = this.entries().find((item) => item.id === id)?.name ?? id
        const met = (await this.resolve({ tool: id, version, requestedBy: tool.id }, [tool.id])).status !== 'needs'
        return { tool: id, name, version: version ?? null, met }
      }),
    )
    const declared = this.declared().some((item) => item.id === tool.id)
    const base = { id: tool.id, name: tool.name, installed, requires, declared, get: this.hints(tool) }
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
