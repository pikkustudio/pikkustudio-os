import { z } from 'zod'
import { pikkuFunc } from '#pikku/addon/function'
import { serviceGate } from '../lib/service-gate.js'
import { missingLibs } from '../lib/tools/libs.js'

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
  declared: z.boolean(),
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
  func: async ({ studioTools }) => ({ tools: await studioTools.list() }),
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
  func: async ({ studioTools }) => {
    studioTools.checkAgain()
    return { tools: await studioTools.list() }
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
  func: async ({ studioTools }, { tool, version }) => studioTools.install(tool, version),
})

export const RemoveToolInput = z.object({ tool: z.string(), version: z.string() })

export const removeTool = pikkuFunc({
  expose: true,
  auth: true,
  description: 'Remove an installed version of a tool.',
  input: RemoveToolInput,
  func: async ({ studioTools }, { tool, version }) => {
    await studioTools.remove(tool, version)
    return null
  },
})

export const ResolveChromiumInput = z.object({})

export const ResolveChromiumOutput = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ready'), bin: z.string() }),
  z.object({
    status: z.literal('needs'),
    tool: z.string(),
    name: z.string(),
    canInstall: z.boolean(),
    missingLibs: z.array(z.string()),
    get: z.object({ brew: z.string().optional(), apt: z.string().optional(), command: z.string().optional(), link: z.string().optional() }),
  }),
])

const CHROMIUM_LIBS_APT =
  'sudo apt-get install -y libglib2.0-0t64 libnss3 libnspr4 libatk1.0-0t64 libatspi2.0-0t64 libdbus-1-3 libx11-6 libxcomposite1 libxdamage1 libxext6 libxfixes3 libxrandr2 libxcb1 libxkbcommon0 libgbm1 libexpat1 libasound2t64'

export const resolveChromium = pikkuFunc({
  expose: true,
  auth: true,
  description: 'Find the Chromium Studio uses to check pages, or say what is missing to run it.',
  input: ResolveChromiumInput,
  output: ResolveChromiumOutput,
  func: async ({ studioTools }) => {
    const chromium = await studioTools.resolve({ tool: 'chromium', requestedBy: 'checkPage' })
    if (chromium.status === 'needs')
      return { status: 'needs' as const, tool: chromium.tool, name: chromium.name, canInstall: chromium.canInstall, missingLibs: [], get: chromium.get }
    const bin = chromium.bins[0] ?? chromium.path
    const missing = await missingLibs(bin)
    if (missing.length)
      return { status: 'needs' as const, tool: chromium.tool, name: 'Chromium system libraries', canInstall: false, missingLibs: missing, get: { apt: CHROMIUM_LIBS_APT } }
    return { status: 'ready' as const, bin }
  },
})
