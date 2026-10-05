import { dirname, join } from 'node:path'
import type { RunTool } from './extract.js'
import { runTool } from './extract.js'

type Need = { tool: string; requestedBy: string }
type Resolution = { status: 'found' | 'installed' | 'needs'; path?: string; bins?: string[]; get?: { brew?: string; apt?: string } }

/** Studio's tool resolver, as far as spindle uses it. */
export type ToolResolver = { resolve: (need: Need) => Promise<Resolution> }

/** The Studio tool each command comes from; ffprobe ships beside ffmpeg. */
const TOOL_OF: Record<string, string> = { ffmpeg: 'ffmpeg', ffprobe: 'ffmpeg', 'whisper-cli': 'whisper-cli', pdftotext: 'pdftotext' }

export const REQUIRED_TOOLS = ['ffmpeg', 'whisper-cli', 'pdftotext'] as const

/**
 * Runs each command through Studio's tools, so a binary Studio found or installed is
 * used by path and a missing one fails with the install hint. Without a resolver
 * (spindle hosted elsewhere) commands are looked up on PATH.
 */
export function studioRunner(tools: ToolResolver | undefined): RunTool {
  if (!tools) return runTool
  return async (command, args, opts) => {
    const id = TOOL_OF[command]
    if (!id) return runTool(command, args, opts)
    const r = await tools.resolve({ tool: id, requestedBy: 'spindle' })
    if (r.status === 'needs') {
      const how = r.get?.brew ?? r.get?.apt
      throw new Error(`${command} is not installed on this worker${how ? ` (${how})` : ''}`)
    }
    const found = r.bins?.[0] ?? r.path!
    const bin = command === 'ffprobe' ? join(dirname(found), 'ffprobe') : command === id ? found : command
    return runTool(bin, args, opts)
  }
}

export async function toolStatus(tools: ToolResolver | undefined) {
  return Promise.all(
    REQUIRED_TOOLS.map(async (tool) => {
      if (!tools) return { tool, status: 'unknown' as const, get: null }
      const r = await tools.resolve({ tool, requestedBy: 'spindle' })
      return { tool, status: r.status === 'needs' ? ('missing' as const) : ('ready' as const), get: r.status === 'needs' ? (r.get ?? null) : null }
    }),
  )
}
