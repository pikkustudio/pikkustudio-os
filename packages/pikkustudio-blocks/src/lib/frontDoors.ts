import { asI18n, type I18nString } from '@pikku/react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectQuery } from './projectRpc'

export type WebApp = { slug: string; url: string | null; state: 'starting' | 'ready' | 'failed'; shot?: string | null; shotAt?: number | null }

type CliCommand = { description?: string; summary?: string; positionals?: Array<{ name: string; required: boolean }>; subcommands?: Record<string, CliCommand> }
type CliProgram = { program: string; description?: string; commands?: Record<string, CliCommand> }
type McpItem = { method: 'resource' | 'tool' | 'prompt'; name?: string; wireId?: string; pikkuFuncId: string; description?: string; summary?: string }
type GatewayItem = { name: string; type: 'webhook' | 'websocket' | 'listener'; platform?: string; route?: string; summary?: string; description?: string }
type HttpRoute = { route: string; method: string; summary?: string }
type Channel = { name: string; route: string; summary?: string }

type Meta = {
  cliMeta?: CliProgram[]
  mcpMeta?: McpItem[]
  gatewayMeta?: GatewayItem[]
  httpMeta?: HttpRoute[]
  channelsMeta?: Record<string, Channel>
}

export type Command = { line: I18nString; about: I18nString }
export type Tool = { name: string; about: I18nString }
export type Gateway = { name: string; how: GatewayItem['type']; about: I18nString }
export type Route = { method: I18nString; route: I18nString; about: I18nString }
export type Docs = { state: 'loading' | 'ready' | 'missing'; open: () => void }

export type Door =
  | { id: string; kind: 'web'; app: WebApp }
  | { id: string; kind: 'cli'; program: I18nString; about: I18nString; commands: Command[] }
  | { id: string; kind: 'mcp'; tools: Tool[]; others: number }
  | { id: string; kind: 'gateway'; platform: string; items: Gateway[] }
  | { id: string; kind: 'http'; routes: Route[]; total: number }
  | { id: string; kind: 'live'; channels: Array<{ name: string; route: I18nString; about: I18nString }> }

export const API_KINDS: Door['kind'][] = ['http', 'live']

const COMMANDS_SHOWN = 5

// Names and descriptions come from the project's own code, so they are not ours to translate.
const say = (text: string): I18nString => asI18n(text)

const flatten = (program: string, commands: Record<string, CliCommand>, trail: string[] = []): Command[] =>
  Object.entries(commands).flatMap(([name, c]) => {
    const path = [...trail, name]
    const args = (c.positionals ?? []).map((p) => (p.required ? `<${p.name}>` : `[${p.name}]`))
    const own = { line: say([program, ...path, ...args].join(' ')), about: say(c.summary ?? c.description ?? '') }
    return [own, ...flatten(program, c.subcommands ?? {}, path)]
  })

const platformOf = (g: GatewayItem) => g.platform ?? 'chat'

export function doorsFrom(apps: WebApp[], meta: Meta | undefined): Door[] {
  const web: Door[] = apps.map((app) => ({ id: `web-${app.slug}`, kind: 'web', app }))
  if (!meta) return web
  const cli: Door[] = (meta.cliMeta ?? []).map((p) => ({
    id: `cli-${p.program}`,
    kind: 'cli',
    program: say(p.program),
    about: say(p.description ?? ''),
    commands: flatten(p.program, p.commands ?? {}).slice(0, COMMANDS_SHOWN),
  }))
  const mcpItems = meta.mcpMeta ?? []
  const tools = mcpItems.filter((i) => i.method === 'tool')
  const mcp: Door[] = mcpItems.length
    ? [{ id: 'mcp', kind: 'mcp', tools: tools.map((t) => ({ name: t.name ?? t.wireId ?? t.pikkuFuncId, about: say(t.summary ?? t.description ?? '') })), others: mcpItems.length - tools.length }]
    : []
  const byPlatform = new Map<string, GatewayItem[]>()
  for (const g of meta.gatewayMeta ?? []) byPlatform.set(platformOf(g), [...(byPlatform.get(platformOf(g)) ?? []), g])
  const gateways: Door[] = [...byPlatform].map(([platform, items]) => ({
    id: `gateway-${platform}`,
    kind: 'gateway',
    platform,
    items: items.map((g) => ({ name: g.name, how: g.type, about: say(g.summary ?? g.description ?? '') })),
  }))
  const routes = meta.httpMeta ?? []
  const http: Door[] = routes.length
    ? [{ id: 'http', kind: 'http', total: routes.length, routes: routes.slice(0, 6).map((r) => ({ method: say(r.method.toUpperCase()), route: say(r.route), about: say(r.summary ?? '') })) }]
    : []
  const channels = Object.values(meta.channelsMeta ?? {})
  const live: Door[] = channels.length ? [{ id: 'live', kind: 'live', channels: channels.map((c) => ({ name: c.name, route: say(c.route), about: say(c.summary ?? '') })) }] : []
  return [...web, ...cli, ...mcp, ...gateways, ...http, ...live]
}

type FileRead = { content?: string; binary?: boolean; truncated?: boolean }

export function useFrontDoors(key: string) {
  const apps = usePikkuQuery('studio:projectApps', { key }, { enabled: !!key, refetchInterval: 4000 })
  const meta = useProjectQuery<Meta>(key, 'console:getAllMeta', {})
  const config = useProjectQuery<FileRead>(key, 'console:readProjectFile', { path: 'pikku.config.json' }, { enabled: !!meta.data?.httpMeta?.length })
  const where = (() => {
    try {
      return (JSON.parse(config.data?.content ?? '{}') as { openAPI?: { outputFile?: string } }).openAPI?.outputFile ?? null
    } catch {
      return null
    }
  })()
  const spec = useProjectQuery<FileRead>(key, 'console:readProjectFile', { path: where ?? '' }, { enabled: !!where })
  const openSpec = () => {
    const content = spec.data?.content
    if (!content) return
    const url = URL.createObjectURL(new Blob([content], { type: where?.endsWith('.json') ? 'application/json' : 'text/plain' }))
    window.open(url, '_blank', 'noopener')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
  const ready = !!spec.data?.content && !spec.data.binary && !spec.data.truncated
  const settled = !meta.data?.httpMeta?.length || config.isError || (config.isSuccess && (!where || spec.isError || spec.isSuccess))
  const docs: Docs = { state: ready ? 'ready' : settled ? 'missing' : 'loading', open: openSpec }
  const doors = doorsFrom((apps.data as WebApp[] | undefined) ?? [], meta.data)
  return {
    doors,
    docs,
    isPending: apps.isPending || meta.isPending,
    error: apps.error ?? meta.error,
    refetch: () => Promise.all([apps.refetch(), meta.refetch()]),
    fetching: apps.isFetching || meta.isFetching,
  }
}

export const shotUrl = (key: string, app: WebApp) =>
  app.shot ? `/studio/shot/${encodeURIComponent(key)}/${app.shot.split('/').map(encodeURIComponent).join('/')}?v=${Math.round(app.shotAt ?? 0)}` : null
