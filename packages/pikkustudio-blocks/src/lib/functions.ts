import { useProjectQuery } from './projectRpc'
import type { AllMeta } from './surface'

export type FnRecord = {
  pikkuFuncId: string
  name?: string
  title?: string
  description?: string
  tags?: string[]
  sourceFile?: string
  exportedName?: string
  inputSchemaName?: string | null
  outputSchemaName?: string | null
  scopes?: string[]
  permissions?: Array<{ type: string; name: string }>
  permissionsInBody?: boolean
  sessionless?: boolean
  auth?: boolean
  expose?: boolean
  mcp?: boolean
  scenario?: boolean
  scenarioStep?: boolean
}

type Ref = { type: string; id: string; name: string }
type UsedBy = { transports: Ref[]; jobs: Ref[]; workflows: Array<{ id: string; name: string }> }
type Scope = { description?: string; scopes?: Record<string, Scope> }

export type FunctionsMeta = Omit<AllMeta, 'functions' | 'functionUsedBy'> & {
  functions?: FnRecord[]
  functionUsedBy?: Record<string, UsedBy>
  scopes?: Record<string, Scope>
}

export const useFunctionsMeta = (key: string) => useProjectQuery<FunctionsMeta>(key, 'console:getAllMeta', {})

export type Who = 'open' | 'signin' | 'perm'
export type Reach = 'web' | 'helper' | 'auto' | 'command' | 'live' | 'none'

export type Entry = {
  id: string
  title: string
  about: string
  own: boolean
  signin: boolean
  perm: boolean
  scopes: string[]
  reach: Reach[]
  used: UsedBy | undefined
  fn: FnRecord
}

export type Filters = { q: string; who: Who[]; reach: Reach[]; scope: string[]; builtin: boolean }

export const WHO: Who[] = ['open', 'signin', 'perm']
export const REACH: Reach[] = ['web', 'helper', 'auto', 'command', 'live', 'none']

const nice = (name: string) => {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_\-.:]+/g, ' ').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

const sentence = (text: string | undefined) => {
  const t = text?.replace(/\s+/g, ' ').trim()
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : ''
}

const isOwn = (file: string | undefined) => !!file && !/\/scaffold\/|\.gen\.|node_modules|\/\.pikku\//.test(file)

export const isTestMachinery = (f: FnRecord) => !!f.scenario || !!f.scenarioStep

export function entriesFrom(meta: FunctionsMeta | undefined): Entry[] {
  if (!meta) return []
  const helperIds = new Set((meta.mcpMeta ?? []).map((t) => t.pikkuFuncId))
  return (meta.functions ?? [])
    .filter((f) => !isTestMachinery(f))
    .map((f) => {
      const used = meta.functionUsedBy?.[f.pikkuFuncId]
      const types = new Set((used?.transports ?? []).map((t) => t.type))
      const reach: Reach[] = []
      if (types.has('http') || (types.has('rpc') && f.expose)) reach.push('web')
      if (types.has('mcp') || helperIds.has(f.pikkuFuncId) || f.mcp) reach.push('helper')
      if ((used?.jobs.length ?? 0) > 0 || (used?.workflows.length ?? 0) > 0) reach.push('auto')
      if (types.has('cli')) reach.push('command')
      if (types.has('channel')) reach.push('live')
      if (reach.length === 0) reach.push('none')
      return {
        id: f.pikkuFuncId,
        title: f.title || nice(f.name || f.pikkuFuncId),
        about: sentence(f.description),
        own: isOwn(f.sourceFile),
        signin: !f.sessionless || f.auth === true,
        perm: (f.permissions?.length ?? 0) > 0 || !!f.permissionsInBody,
        scopes: f.scopes ?? [],
        reach,
        used,
        fn: f,
      }
    })
    .sort((a, b) => a.title.localeCompare(b.title))
}

const whoOf = (e: Entry, w: Who) => (w === 'open' ? !e.signin : w === 'signin' ? e.signin : e.perm)

type Skip = 'who' | 'reach' | 'scope' | 'builtin' | null

export function matches(e: Entry, f: Filters, skip: Skip = null) {
  if (skip !== 'builtin' && !f.builtin && !e.own) return false
  if (skip !== 'who' && f.who.length && !f.who.some((w) => whoOf(e, w))) return false
  if (skip !== 'reach' && f.reach.length && !f.reach.some((r) => e.reach.includes(r))) return false
  if (skip !== 'scope' && f.scope.length && !f.scope.some((s) => e.scopes.includes(s))) return false
  const needle = f.q.trim().toLowerCase()
  if (needle && ![e.id, e.title, e.about, ...e.scopes].some((v) => v.toLowerCase().includes(needle))) return false
  return true
}

export const countFor = (entries: Entry[], f: Filters, group: Skip, pick: (e: Entry) => boolean) => entries.filter((e) => matches(e, f, group) && pick(e)).length

export const reachHas = (e: Entry, r: Reach) => e.reach.includes(r)
export const whoHas = whoOf

export const hasFilters = (f: Filters) => !!(f.q || f.who.length || f.reach.length || f.scope.length || f.builtin)

const list = <T extends string>(v: unknown, ok: readonly T[] | null): T[] =>
  typeof v === 'string' && v ? (v.split(',').filter((x) => !ok || ok.includes(x as T)) as T[]) : []

export function filtersFrom(s: { fq?: string; who?: string; reach?: string; scope?: string; builtin?: string }): Filters {
  return { q: s.fq ?? '', who: list(s.who, WHO), reach: list(s.reach, REACH), scope: list(s.scope, null), builtin: s.builtin === '1' }
}

export const searchFrom = (f: Filters) => ({
  fq: f.q || undefined,
  who: f.who.length ? f.who.join(',') : undefined,
  reach: f.reach.length ? f.reach.join(',') : undefined,
  scope: f.scope.length ? f.scope.join(',') : undefined,
  builtin: f.builtin ? '1' : undefined,
})

export function scopeNotes(meta: FunctionsMeta | undefined): Record<string, string> {
  const out: Record<string, string> = {}
  const walk = (tree: Record<string, Scope> | undefined, trail: string[]) => {
    for (const [name, s] of Object.entries(tree ?? {})) {
      const path = [...trail, name]
      if (s.description) out[path.join(':')] = s.description
      walk(s.scopes, path)
    }
  }
  walk(meta?.scopes, [])
  return out
}

export const niceName = nice
