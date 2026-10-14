import baked from './manifest.json' with { type: 'json' }

export type Platform = 'darwin-arm64' | 'darwin-x64' | 'linux-arm64' | 'linux-x64'

export interface Artifact {
  url: string
  sha256: string
  size?: number
  format: 'tar.gz' | 'zip'
  bin: string[]
}

export interface ToolVersion {
  version: string
  default?: boolean
  artifacts: Partial<Record<Platform, Artifact>>
}

export interface ToolFind {
  command?: string[]
  endpoint?: string
  version: string
}

export interface GetHints {
  brew?: string
  apt?: string
  command?: string
  link?: string
}

export interface ToolEntry {
  id: string
  name: string
  platforms?: Array<'darwin' | 'linux'>
  find: ToolFind
  versions: ToolVersion[]
  env: Record<string, string>
  get: GetHints
}

export interface Manifest {
  tools: ToolEntry[]
}

export const bakedManifest = baked as Manifest

export const currentPlatform = (): Platform | null => {
  const os = process.platform
  const arch = process.arch
  if ((os === 'darwin' || os === 'linux') && (arch === 'arm64' || arch === 'x64')) return `${os}-${arch}`
  return null
}

export const appliesTo = (tool: ToolEntry, platform: Platform | null) =>
  !tool.platforms || (platform !== null && tool.platforms.some((os) => platform.startsWith(`${os}-`)))
