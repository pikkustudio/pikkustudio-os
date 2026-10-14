import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'

export const ToolStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['found', 'installed', 'missing', 'unavailable']),
  version: z.string().nullable(),
  path: z.string().nullable(),
  size: z.number().nullable(),
  canInstall: z.boolean(),
  installed: z.array(z.object({ version: z.string(), path: z.string(), size: z.number() })),
  get: z.object({
    brew: z.string().optional(),
    apt: z.string().optional(),
    command: z.string().optional(),
    link: z.string().optional(),
  }),
})

export const ToolsOutput = z.object({ tools: z.array(ToolStatusSchema) })

export const ListToolsInput = z.object({})

export const listTools = pikkuFunc({
  expose: true,
  readonly: true,
  auth: true,
  description: 'Every tool Studio knows on this machine: found, installed, missing or not available.',
  input: ListToolsInput,
  output: ToolsOutput,
  func: async ({ studio }) => ({ tools: await studio.tools.list() }),
})

export const CheckToolsInput = z.object({})

export const checkTools = pikkuFunc({
  expose: true,
  auth: true,
  description: 'Look for every tool on the machine again.',
  input: CheckToolsInput,
  output: ToolsOutput,
  func: async ({ studio }) => {
    studio.tools.checkAgain()
    return { tools: await studio.tools.list() }
  },
})

export const InstalledToolOutput = z.object({ tool: z.string(), version: z.string(), path: z.string() })

export const InstallToolInput = z.object({ tool: z.string(), version: z.string().optional() })

export const installTool = pikkuFunc({
  expose: true,
  auth: true,
  description: "Install a tool from Studio's manifest.",
  input: InstallToolInput,
  output: InstalledToolOutput,
  func: async ({ studio }, { tool, version }) => studio.tools.install(tool, version),
})

export const RemoveToolInput = z.object({ tool: z.string(), version: z.string() })

export const removeTool = pikkuFunc({
  expose: true,
  auth: true,
  description: 'Remove an installed version of a tool.',
  input: RemoveToolInput,
  func: async ({ studio }, { tool, version }) => {
    await studio.tools.remove(tool, version)
    return null
  },
})
