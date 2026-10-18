import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export interface DeclaredTool {
  id: string
  version?: string
}

const CONFIG = 'pikku.config.json'

const read = (projectDir: string) => {
  try {
    const text = readFileSync(join(projectDir, CONFIG), 'utf8')
    const config = JSON.parse(text) as Record<string, unknown>
    return config && typeof config === 'object' && !Array.isArray(config) ? { text, config } : null
  } catch {
    return null
  }
}

export function declaredTools(projectDir: string | undefined): DeclaredTool[] {
  const config = projectDir ? read(projectDir)?.config : null
  if (!config || !Array.isArray(config.tools)) return []
  return config.tools.flatMap((item): DeclaredTool[] => {
    if (!item || typeof item.id !== 'string') return []
    return [typeof item.version === 'string' ? { id: item.id, version: item.version } : { id: item.id }]
  })
}

const indentOf = (text: string) => {
  const match = text.match(/^([ \t]+)"/m)
  return match ? match[1] : 2
}

export function declareTool(projectDir: string | undefined, tool: DeclaredTool): boolean {
  if (!projectDir) return false
  const file = read(projectDir)
  if (!file) return false
  const { text, config } = file
  const current = Array.isArray(config.tools) ? (config.tools as DeclaredTool[]) : []
  if (current.some((item) => item?.id === tool.id)) return false
  config.tools = [...current, tool.version ? { id: tool.id, version: tool.version } : { id: tool.id }]
  writeFileSync(join(projectDir, CONFIG), `${JSON.stringify(config, null, indentOf(text))}${text.endsWith('\n') ? '\n' : ''}`)
  return true
}
