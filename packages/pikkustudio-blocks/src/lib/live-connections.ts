import { useProjectQuery } from './projectRpc'
import { entriesFrom, niceName, type Entry, type FunctionsMeta } from './functions'

type Step = { pikkuFuncId: string } | null
type Wirings = Record<string, Record<string, { pikkuFuncId: string }>>

export type RawChannel = {
  name: string
  route: string
  summary?: string
  description?: string
  auth?: boolean
  tags?: string[]
  connect?: Step
  disconnect?: Step
  message?: Step
  messageWirings?: Wirings
}

export type LiveMeta = Omit<FunctionsMeta, 'channelsMeta'> & { channelsMeta?: Record<string, RawChannel> }

export const useLiveMeta = (key: string) => useProjectQuery<LiveMeta>(key, 'console:getAllMeta', {})

export type Who = 'open' | 'signin' | 'perm'
export const WHO: Who[] = ['open', 'signin', 'perm']

export type Ability = { key: string; label: string; funcId: string; kind: 'join' | 'leave' | 'message' | 'action' }

export type Live = {
  id: string
  title: string
  about: string
  route: string
  signin: boolean
  perm: boolean
  scopes: string[]
  abilities: Ability[]
  funcs: Entry[]
}

export type Filters = { q: string; who: Who[]; scope: string[] }

const sentence = (t: string | undefined) => {
  const s = t?.replace(/\s+/g, ' ').trim()
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

export function liveFrom(meta: LiveMeta | undefined): Live[] {
  if (!meta) return []
  const byId = new Map(entriesFrom(meta as FunctionsMeta).map((e) => [e.id, e]))
  return Object.values(meta.channelsMeta ?? {})
    .map((c) => {
      const abilities: Ability[] = []
      if (c.connect) abilities.push({ key: 'join', label: '', funcId: c.connect.pikkuFuncId, kind: 'join' })
      if (c.message) abilities.push({ key: 'message', label: '', funcId: c.message.pikkuFuncId, kind: 'message' })
      for (const [group, items] of Object.entries(c.messageWirings ?? {}))
        for (const [name, w] of Object.entries(items))
          if (!name.startsWith('__')) abilities.push({ key: `${group}:${name}`, label: niceName(name), funcId: w.pikkuFuncId, kind: 'action' })
      if (c.disconnect) abilities.push({ key: 'leave', label: '', funcId: c.disconnect.pikkuFuncId, kind: 'leave' })
      const funcs = [...new Set(abilities.map((a) => a.funcId))].map((id) => byId.get(id)).filter((e): e is Entry => !!e)
      const gate = c.connect ? byId.get(c.connect.pikkuFuncId) : undefined
      return {
        id: c.name,
        title: niceName(c.name),
        about: sentence(c.summary) || sentence(c.description) || funcs.find((f) => f.about)?.about || '',
        route: c.route,
        signin: c.auth !== false || !!gate?.signin,
        perm: funcs.some((f) => f.perm),
        scopes: [...new Set(funcs.flatMap((f) => f.scopes))].sort(),
        abilities,
        funcs,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

const whoOf = (l: Live, w: Who) => (w === 'open' ? !l.signin : w === 'signin' ? l.signin : l.perm)

type Skip = 'who' | 'scope' | null

export function matches(l: Live, f: Filters, skip: Skip = null) {
  if (skip !== 'who' && f.who.length && !f.who.some((w) => whoOf(l, w))) return false
  if (skip !== 'scope' && f.scope.length && !f.scope.some((s) => l.scopes.includes(s))) return false
  const needle = f.q.trim().toLowerCase()
  if (needle && ![l.id, l.title, l.about, l.route, ...l.scopes, ...l.abilities.map((a) => a.label)].some((v) => v.toLowerCase().includes(needle))) return false
  return true
}

export const countFor = (list: Live[], f: Filters, group: Skip, pick: (l: Live) => boolean) => list.filter((l) => matches(l, f, group) && pick(l)).length
export const whoHas = whoOf
export const hasFilters = (f: Filters) => !!(f.q || f.who.length || f.scope.length)

const csv = <T extends string>(v: unknown, ok: readonly T[] | null): T[] =>
  typeof v === 'string' && v ? (v.split(',').filter((x) => !ok || ok.includes(x as T)) as T[]) : []

export const filtersFrom = (s: { fq?: string; who?: string; scope?: string }): Filters => ({ q: s.fq ?? '', who: csv(s.who, WHO), scope: csv(s.scope, null) })

export const searchFrom = (f: Filters) => ({
  fq: f.q || undefined,
  who: f.who.length ? f.who.join(',') : undefined,
  scope: f.scope.length ? f.scope.join(',') : undefined,
})
