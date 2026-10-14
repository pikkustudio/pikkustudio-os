import type { ToolFind } from './manifest.js'

export interface Found {
  version: string | null
  path: string
}

const match = (text: string, pattern: string) => new RegExp(pattern).exec(text)?.[1] ?? null

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
  const child = Bun.spawn([path, ...args], { stdout: 'pipe', stderr: 'pipe', stdin: 'ignore', timeout: 5000 })
  const [out, err] = await Promise.all([new Response(child.stdout).text(), new Response(child.stderr).text()])
  await child.exited
  const version = match(`${out}\n${err}`, find.version)
  return version ? { version, path } : null
}

export const findOnMachine = async (find: ToolFind, searchPath: string) =>
  (await byEndpoint(find)) ?? (await byCommand(find, searchPath))
