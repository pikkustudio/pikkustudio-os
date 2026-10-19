import { entriesFrom, niceName, type Entry } from './functions'
import { useLiveMeta, type LiveMeta } from './live-connections'

export const useToolsMeta = useLiveMeta

export type Kind = 'tool' | 'resource' | 'prompt'
export type Who = 'open' | 'signin' | 'perm'
export const KINDS: Kind[] = ['tool', 'resource', 'prompt']
export const WHO: Who[] = ['open', 'signin', 'perm']

export type Tool = {
  id: string
  kind: Kind
  title: string
  about: string
  uri: string
  args: Array<{ name: string; about: string; needed: boolean }>
  signin: boolean
  perm: boolean
  scopes: string[]
  fn: Entry | undefined
  funcId: string
}

export type Filters = { q: string; kind: Kind[]; who: Who[]; scope: string[] }

const sentence = (t: string | undefined) => {
  const s = t?.replace(/\s+/g, ' ').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

export function toolsFrom(meta: LiveMeta | undefined): Tool[] {
  if (!meta) return []
  const byId = new Map(entriesFrom(meta as never).map((e) => [e.id, e]))
  return (meta.mcpMeta ?? [])
    .map((t) => {
      const fn = byId.get(t.pikkuFuncId)
      const raw = t.name ?? t.wireId ?? t.pikkuFuncId
      return {
        id: `${t.method}:${t.wireId ?? raw}`,
        kind: (KINDS.includes(t.method as Kind) ? t.method : 'tool') as Kind,
        title: niceName(raw),
        about: sentence(t.summary) || sentence(t.description) || fn?.about || '',
        uri: t.uri ?? '',
        args: (t.arguments ?? []).map((a) => ({ name: a.name, about: sentence(a.description), needed: !!a.required })),
        signin: fn?.signin ?? true,
        perm: fn?.perm ?? false,
        scopes: fn?.scopes ?? [],
        fn,
        funcId: t.pikkuFuncId,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

const whoOf = (t: Tool, w: Who) => (w === 'open' ? !t.signin : w === 'signin' ? t.signin : t.perm)

type Skip = 'kind' | 'who' | 'scope' | null

export function matches(t: Tool, f: Filters, skip: Skip = null) {
  if (skip !== 'kind' && f.kind.length && !f.kind.includes(t.kind)) return false
  if (skip !== 'who' && f.who.length && !f.who.some((w) => whoOf(t, w))) return false
  if (skip !== 'scope' && f.scope.length && !f.scope.some((s) => t.scopes.includes(s))) return false
  const needle = f.q.trim().toLowerCase()
  if (needle && ![t.id, t.title, t.about, t.uri, t.funcId, ...t.scopes].some((v) => v.toLowerCase().includes(needle))) return false
  return true
}

export const countFor = (list: Tool[], f: Filters, group: Skip, pick: (t: Tool) => boolean) => list.filter((t) => matches(t, f, group) && pick(t)).length
export const whoHas = whoOf
export const hasFilters = (f: Filters) => !!(f.q || f.kind.length || f.who.length || f.scope.length)

const csv = <T extends string>(v: unknown, ok: readonly T[] | null): T[] =>
  typeof v === 'string' && v ? (v.split(',').filter((x) => !ok || ok.includes(x as T)) as T[]) : []

export const filtersFrom = (s: { fq?: string; kind?: string; who?: string; scope?: string }): Filters => ({ q: s.fq ?? '', kind: csv(s.kind, KINDS), who: csv(s.who, WHO), scope: csv(s.scope, null) })

export const searchFrom = (f: Filters) => ({
  fq: f.q || undefined,
  kind: f.kind.length ? f.kind.join(',') : undefined,
  who: f.who.length ? f.who.join(',') : undefined,
  scope: f.scope.length ? f.scope.join(',') : undefined,
})
