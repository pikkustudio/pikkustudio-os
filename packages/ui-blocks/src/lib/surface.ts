import { useProjectQuery } from './projectRpc'

export type Way = 'web' | 'tool' | 'command' | 'chat' | 'live'

export type FnMeta = {
  pikkuFuncId: string
  name?: string
  inputSchemaName?: string | null
  outputSchemaName?: string | null
  sourceFile?: string
  exportedName?: string
  scopes?: string[]
  auth?: boolean
  expose?: boolean
}

type Ref = { type: string; id: string; name: string }
type UsedBy = { transports: Ref[]; jobs: Ref[]; workflows: Array<{ id: string; name: string }> }

type Http = { pikkuFuncId: string; route: string; method: string; params?: string[]; query?: string[]; summary?: string; description?: string; auth?: boolean; sse?: boolean }
type Mcp = { pikkuFuncId: string; method: 'resource' | 'tool' | 'prompt'; name?: string; wireId?: string; description?: string; summary?: string; uri?: string; arguments?: Array<{ name: string; description?: string; required?: boolean }> }
type Option = { description: string; short?: string; required?: boolean; default?: unknown }
type Cmd = { pikkuFuncId: string; description?: string; summary?: string; positionals: Array<{ name: string; required: boolean; variadic?: boolean }>; options: Record<string, Option>; subcommands?: Record<string, Cmd> }
type Program = { wireId: string; program: string; description?: string; commands: Record<string, Cmd> }
type Gateway = { pikkuFuncId: string; name: string; type: 'webhook' | 'websocket' | 'listener'; route?: string; platform?: string; summary?: string; description?: string; auth?: boolean }
type ChannelStep = { pikkuFuncId: string; summary?: string } | null
type Channel = { name: string; route: string; params?: string[]; query?: string[]; summary?: string; description?: string; connect: ChannelStep; disconnect: ChannelStep; message: ChannelStep }

export type AllMeta = {
  functions?: FnMeta[]
  httpMeta?: Http[]
  mcpMeta?: Mcp[]
  cliMeta?: Program[]
  gatewayMeta?: Gateway[]
  channelsMeta?: Record<string, Channel>
  functionUsedBy?: Record<string, UsedBy>
}

export type Field = { name: string; label: string; needed: boolean }

export type Item = {
  id: string
  way: Way
  title: string
  line: string
  about: string
  tag: string
  funcId: string | null
  fields: Field[]
  open?: boolean
  steps: Array<{ label: string; funcId: string }>
  group?: string
}

const field = (name: string, label: string, needed: boolean): Field => ({ name, label, needed })

const commandsOf = (program: string, commands: Record<string, Cmd>, trail: string[] = []): Item[] =>
  Object.entries(commands).flatMap(([name, c]) => {
    const path = [...trail, name]
    const args = c.positionals.map((p) => (p.required ? `<${p.name}>` : `[${p.name}]`))
    const own: Item = {
      id: `command:${program}:${path.join(' ')}`,
      way: 'command',
      title: [program, ...path].join(' '),
      line: [program, ...path, ...args].join(' '),
      about: c.summary ?? c.description ?? '',
      tag: program,
      funcId: c.pikkuFuncId || null,
      fields: [
        ...c.positionals.map((p) => field(p.name, p.name, p.required)),
        ...Object.entries(c.options ?? {}).map(([o, v]) => field(`--${o}`, v.description, !!v.required)),
      ],
      steps: [],
      group: program,
    }
    return [own, ...commandsOf(program, c.subcommands ?? {}, path)]
  })

export function itemsFrom(meta: AllMeta | undefined): Item[] {
  if (!meta) return []
  const web: Item[] = (meta.httpMeta ?? [])
    .slice()
    .sort((a, b) => a.route.localeCompare(b.route) || a.method.localeCompare(b.method))
    .map((r) => ({
      id: `web:${r.method}:${r.route}`,
      way: 'web',
      title: r.summary || r.route,
      line: `${r.method.toUpperCase()} ${r.route}`,
      about: r.description ?? '',
      tag: r.method.toUpperCase(),
      funcId: r.pikkuFuncId || null,
      fields: [...(r.params ?? []).map((p) => field(p, p, true)), ...(r.query ?? []).map((q) => field(q, q, false))],
      open: r.auth === false,
      steps: [],
    }))
  const tools: Item[] = (meta.mcpMeta ?? []).map((t) => ({
    id: `tool:${t.method}:${t.wireId ?? t.name ?? t.pikkuFuncId}`,
    way: 'tool',
    title: t.name ?? t.wireId ?? t.pikkuFuncId,
    line: t.uri ?? t.name ?? t.pikkuFuncId,
    about: t.summary ?? t.description ?? '',
    tag: t.method,
    funcId: t.pikkuFuncId || null,
    fields: (t.arguments ?? []).map((a) => field(a.name, a.description ?? a.name, !!a.required)),
    steps: [],
  }))
  const commands = (meta.cliMeta ?? []).flatMap((p) => commandsOf(p.program, p.commands ?? {}))
  const chat: Item[] = (meta.gatewayMeta ?? []).map((g) => ({
    id: `chat:${g.platform ?? ''}:${g.name}`,
    way: 'chat',
    title: g.name,
    line: g.route ?? g.name,
    about: g.summary ?? g.description ?? '',
    tag: g.type,
    funcId: g.pikkuFuncId || null,
    fields: [],
    open: g.auth === false,
    steps: [],
    group: g.platform ?? 'chat',
  }))
  const live: Item[] = Object.values(meta.channelsMeta ?? {}).map((c) => ({
    id: `live:${c.name}`,
    way: 'live',
    title: c.name,
    line: c.route,
    about: c.summary ?? c.description ?? '',
    tag: 'live',
    funcId: (c.message ?? c.connect)?.pikkuFuncId ?? null,
    fields: [...(c.params ?? []).map((p) => field(p, p, true)), ...(c.query ?? []).map((q) => field(q, q, false))],
    steps: [
      ...(c.connect ? [{ label: 'connect', funcId: c.connect.pikkuFuncId }] : []),
      ...(c.message ? [{ label: 'message', funcId: c.message.pikkuFuncId }] : []),
      ...(c.disconnect ? [{ label: 'disconnect', funcId: c.disconnect.pikkuFuncId }] : []),
    ],
  }))
  return [...web, ...tools, ...commands, ...chat, ...live]
}

export const fnOf = (meta: AllMeta | undefined, id: string | null): FnMeta | undefined =>
  id ? meta?.functions?.find((f) => f.pikkuFuncId === id) : undefined

export type SchemaNode = {
  type?: string | string[]
  format?: string
  enum?: unknown[]
  description?: string
  properties?: Record<string, SchemaNode>
  required?: string[]
  items?: SchemaNode
  $ref?: string
  anyOf?: SchemaNode[]
  oneOf?: SchemaNode[]
  definitions?: Record<string, SchemaNode>
  $defs?: Record<string, SchemaNode>
}

const typeOf = (n: SchemaNode, root: SchemaNode): string => {
  if (n.$ref) {
    const name = n.$ref.split('/').pop() ?? ''
    const hit = (root.definitions ?? root.$defs ?? {})[name]
    return hit ? typeOf(hit, root) : name
  }
  if (n.enum) return n.enum.map(String).join(' | ')
  const alt = n.anyOf ?? n.oneOf
  if (alt) return alt.map((a) => typeOf(a, root)).join(' | ')
  const base = Array.isArray(n.type) ? n.type.join(' | ') : (n.type ?? 'any')
  if (base === 'array' && n.items) return `${typeOf(n.items, root)}[]`
  if (base === 'object' && n.properties) return 'object'
  return n.format ? `${base} (${n.format})` : base
}

export type SchemaField = { name: string; type: string; needed: boolean; about: string }

export function fieldsOfSchema(schema: SchemaNode | null | undefined): { fields: SchemaField[]; plain: string | null } {
  if (!schema) return { fields: [], plain: null }
  const resolved = schema.$ref ? ((schema.definitions ?? schema.$defs ?? {})[schema.$ref.split('/').pop() ?? ''] ?? schema) : schema
  const props = resolved.properties
  if (!props) return { fields: [], plain: typeOf(resolved, schema) === 'any' ? null : typeOf(resolved, schema) }
  const needed = new Set(resolved.required ?? [])
  return {
    fields: Object.entries(props).map(([name, n]) => ({ name, type: typeOf(n, schema), needed: needed.has(name), about: n.description ?? '' })),
    plain: null,
  }
}

export function useSurfaceMeta(key: string) {
  return useProjectQuery<AllMeta>(key, 'console:getAllMeta', {})
}

export function useSchema(key: string, name: string | null | undefined) {
  return useProjectQuery<SchemaNode | null>(key, 'console:getSchema', { schemaName: name ?? '' }, { enabled: !!name })
}

export type SurfaceSymbol = { name: string; kind: string; summary?: string; docs?: string; deprecated?: string }
export type SurfaceLeaf = { specifier: string; name: string; step: string; summary: string; symbols: SurfaceSymbol[] }
export type SurfaceDoc = { version: string; entryPoints: Array<{ id: string; job: string; summary: string; leaves: SurfaceLeaf[] }> }
export type SurfaceUsage = { bySpecifier: Record<string, Record<string, { imports: number; seenIn: string[]; files: string[] }>> }
export type SurfaceResult = { doc: SurfaceDoc | null; usage?: SurfaceUsage }

export function useSurfaceDoc(key: string) {
  return useProjectQuery<SurfaceResult>(key, 'console:getSurface', {})
}

export const usedIn = (usage: SurfaceUsage | undefined, leaf: SurfaceLeaf): number | null => {
  if (!usage || !Object.keys(usage.bySpecifier).length) return null
  const per = usage.bySpecifier[leaf.specifier] ?? {}
  return leaf.symbols.reduce((sum, s) => sum + (per[s.name]?.imports ?? 0), 0)
}
