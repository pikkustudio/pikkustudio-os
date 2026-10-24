import baked from './manifest.json' with { type: 'json' }

export type Platform = 'darwin-arm64' | 'darwin-x64' | 'linux-arm64' | 'linux-x64'

export interface Artifact {
  url: string
  sha256: string
  size?: number
  format: 'tar.gz' | 'zip'
  bin: string[]
  root?: string
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
  roots?: string[]
  bin?: string[]
  versionFile?: string
  files?: Record<string, string[]>
}

export interface GetHints {
  brew?: string
  apt?: string
  command?: string
  link?: string
  note?: string
}

export interface ToolGet extends GetHints {
  platforms?: Partial<Record<Platform, GetHints>>
}

export interface ToolEntry {
  id: string
  name: string
  platforms?: Array<'darwin' | 'linux'>
  find: ToolFind
  requires?: string[]
  versions: ToolVersion[]
  env: Record<string, string>
  get: ToolGet
}

export const parseRequirement = (requirement: string) => {
  const at = requirement.indexOf('@')
  return at === -1
    ? { tool: requirement, version: undefined }
    : { tool: requirement.slice(0, at), version: requirement.slice(at + 1) || undefined }
}

export interface Manifest {
  tools: ToolEntry[]
}

export const bakedManifest = baked as unknown as Manifest

export const currentPlatform = (): Platform | null => {
  const os = process.platform
  const arch = process.arch
  if ((os === 'darwin' || os === 'linux') && (arch === 'arm64' || arch === 'x64')) return `${os}-${arch}`
  return null
}

export const appliesTo = (tool: ToolEntry, platform: Platform | null) =>
  !tool.platforms || (platform !== null && tool.platforms.some((os) => platform.startsWith(`${os}-`)))
