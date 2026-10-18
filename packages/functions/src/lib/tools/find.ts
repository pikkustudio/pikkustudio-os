import { existsSync, realpathSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { Platform, ToolFind } from './manifest.js'

export interface Found {
  version: string | null
  path: string
  root?: string
  bins?: string[]
}

export interface FindContext {
  searchPath: string
  platform: Platform | null
  env: Record<string, string | undefined>
}

const match = (text: string, pattern: string) => new RegExp(pattern).exec(text)?.[1] ?? null

const run = async (path: string, args: string[]) => {
  const child = Bun.spawn([path, ...args], { stdout: 'pipe', stderr: 'pipe', stdin: 'ignore', timeout: 5000 })
  const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()])
  await child.exited
  return `${out}\n${err}`
}

const byEndpoint = async (find: ToolFind): Promise<Found | null> => {
  if (!find.endpoint) return null
  const response = await fetch(find.endpoint, { signal: AbortSignal.timeout(500) }).catch(() => null)
  if (!response?.ok) return null
  return { version: match(await response.text(), find.version), path: find.endpoint }
}

const byCommand = async (find: ToolFind, searchPath: string): Promise<Found | null> => {
  const [name, ...args] = find.command ?? []
  if (!name) return null
  const path = Bun.which(name, { PATH: searchPath })
  if (!path) return null
  const version = match(await run(path, args), find.version)
  return version ? { version, path } : null
}

const rootPath = (spec: string, context: FindContext) => {
  if (spec.startsWith('$')) return context.env[spec.slice(1)] || null
  if (spec.startsWith('which:')) {
    const [name, ...steps] = spec.slice('which:'.length).split('/')
    const path = name ? Bun.which(name, { PATH: context.searchPath }) : null
    if (!path) return null
    try {
      return resolve(realpathSync(path), ...steps)
    } catch {
      return null
    }
  }
  return spec
}

const byRoot = async (find: ToolFind, root: string, context: FindContext): Promise<Found | null> => {
  const files = [...(find.files?.['*'] ?? []), ...(context.platform ? (find.files?.[context.platform] ?? []) : [])]
  const bins = (find.bin ?? []).map((bin) => join(root, bin))
  if (![...files.map((file) => join(root, file)), ...bins].every((file) => existsSync(file))) return null
  let text = ''
  if (find.versionFile) text = await readFile(join(root, find.versionFile), 'utf8').catch(() => '')
  else if (bins[0]) text = await run(bins[0], (find.command ?? []).slice(1)).catch(() => '')
  const version = match(text, find.version)
  return version ? { version, path: root, root, bins } : null
}

const byRoots = async (find: ToolFind, context: FindContext) => {
  const roots = [...new Set((find.roots ?? []).map((spec) => rootPath(spec, context)).filter((root): root is string => !!root))]
  const found = await Promise.all(roots.map((root) => byRoot(find, root, context)))
  return found.filter((item): item is Found => item !== null)
}

export const findOnMachine = async (find: ToolFind, context: FindContext): Promise<Found[]> => {
  const [endpoint, rooted, command] = await Promise.all([
    byEndpoint(find),
    byRoots(find, context),
    find.roots ? null : byCommand(find, context.searchPath),
  ])
  return [endpoint, ...rooted, command].filter((item): item is Found => item !== null)
}
