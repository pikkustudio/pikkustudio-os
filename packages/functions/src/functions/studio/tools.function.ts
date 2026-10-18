import { z } from 'zod'
import { pikkuFunc } from '#pikku/function'
import { serviceGate } from '../../middleware/service.middleware.js'

export const ToolStatusSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: z.enum(['found', 'installed', 'missing', 'unavailable']),
  version: z.string().nullable(),
  path: z.string().nullable(),
  size: z.number().nullable(),
  canInstall: z.boolean(),
  installed: z.array(z.object({ version: z.string(), path: z.string(), size: z.number() })),
  requires: z.array(z.object({ tool: z.string(), name: z.string(), version: z.string().nullable(), met: z.boolean() })),
  get: z.object({
    brew: z.string().optional(),
    apt: z.string().optional(),
    command: z.string().optional(),
    link: z.string().optional(),
    note: z.string().optional(),
  }),
})

export const ToolsOutput = z.object({ tools: z.array(ToolStatusSchema) })

export const ListToolsInput = z.object({})

export const listTools = pikkuFunc({
  expose: true,
  mcp: true,
  readonly: true,
  auth: true,
  middleware: [serviceGate],
  description:
    'List the tools Studio manages on this machine, such as Ghidra, a JDK and REA, with whether each is found, installed, missing or unavailable, its version and path, what it requires, and whether Studio can install it. Call this first when a command or tool says something is missing.',
  input: ListToolsInput,
  output: ToolsOutput,
  func: async ({ studio }) => ({ tools: await studio.tools.list() }),
})

export const CheckToolsInput = z.object({})

export const checkTools = pikkuFunc({
  expose: true,
  mcp: true,
  auth: true,
  middleware: [serviceGate],
  description:
    'Look for every managed tool on the machine again and return the fresh list. Use it after installing a tool by hand or changing PATH, when listTools still reports a tool as missing.',
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
  mcp: true,
  auth: true,
  middleware: [serviceGate],
  description:
    'Install a missing tool such as Ghidra, a JDK or REA after a tool answered that it needs one. Pass the tool id from listTools and optionally a version; returns the installed version and path. Only tools with canInstall true can be installed.',
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
