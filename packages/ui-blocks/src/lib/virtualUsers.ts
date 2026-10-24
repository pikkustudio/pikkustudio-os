import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useProjectQuery } from './projectRpc'

export type Disposition = 'realistic' | 'careless' | 'newcomer' | 'stale' | 'auditor' | 'adversarial' | 'accountable'

type Persona = { id?: string; name: string; description?: string; jobTitle?: string; disposition?: Disposition; goals?: string[]; roles?: string[]; runnable?: boolean }

export type FindingKind = 'server-error' | 'transport-error' | 'schema-violation' | 'unexpected-success' | 'custom'

export type Run = {
  runId: string
  persona: string
  status: 'running' | 'completed' | 'failed'
  createdAt: string
  finishedAt: string | null
  error: string | null
  findings: { kind: FindingKind; detail: string; step: number; intentId?: string }[]
  intents: { id: string; title: string; status: string }[]
}

export type Schedule = { persona: string; enabled: boolean; minIntervalMs: number; maxIntervalMs: number; nextRunAt: string }

export type VirtualUser = {
  id: string
  name: I18nString
  job?: I18nString
  description?: I18nString
  disposition: Disposition
  goals: I18nString[]
  roles: string[]
  visits: Run[]
  visiting: boolean
  schedule?: Schedule
}

/** What each kind of visitor is like: a short name and one line about them. */
export const kindOf = (d: Disposition): [I18nString, I18nString] => {
  const kinds: Record<Disposition, [I18nString, I18nString]> = {
    realistic: [m.virtual_users__kind_realistic(), m.virtual_users__kind_realistic_text()],
    careless: [m.virtual_users__kind_careless(), m.virtual_users__kind_careless_text()],
    newcomer: [m.virtual_users__kind_newcomer(), m.virtual_users__kind_newcomer_text()],
    stale: [m.virtual_users__kind_stale(), m.virtual_users__kind_stale_text()],
    auditor: [m.virtual_users__kind_auditor(), m.virtual_users__kind_auditor_text()],
    adversarial: [m.virtual_users__kind_adversarial(), m.virtual_users__kind_adversarial_text()],
    accountable: [m.virtual_users__kind_accountable(), m.virtual_users__kind_accountable_text()],
  }
  return kinds[d]
}

/** How a goal ended, in words; a status we do not know is shown as the app reports it. */
export const goalWord = (status: string): I18nString => {
  switch (status) {
    case 'completed':
      return m.virtual_users__goal_completed()
    case 'stuck':
      return m.virtual_users__goal_stuck()
    case 'abandoned':
      return m.virtual_users__goal_abandoned()
    case 'suspended':
      return m.virtual_users__goal_suspended()
    case 'open':
      return m.virtual_users__goal_open()
    default:
      return asI18n(status)
  }
}

export const FOUND = (name: string, kind: FindingKind, detail: string): I18nString =>
  ({
    'server-error': m.virtual_users__found_server_error({ name }),
    'transport-error': m.virtual_users__found_transport_error({ name }),
    'schema-violation': m.virtual_users__found_schema_violation({ name }),
    'unexpected-success': m.virtual_users__found_unexpected_success({ name }),
    custom: m.virtual_users__found_custom({ name, detail }),
  })[kind]

const SEVERITY: Record<FindingKind, number> = { 'unexpected-success': 0, 'server-error': 1, 'schema-violation': 2, custom: 3, 'transport-error': 4 }

export const problemsOf = (run: Run) => {
  const goals = new Map(run.intents.map((i) => [i.id, i.title]))
  const lines = new Map<string, { kind: FindingKind; detail: string; goal?: string; count: number }>()
  for (const f of run.findings) {
    const key = `${f.kind}|${f.intentId ?? ''}|${f.kind === 'custom' ? f.detail : ''}`
    const line = lines.get(key) ?? { kind: f.kind, detail: f.detail, goal: f.intentId ? goals.get(f.intentId) : undefined, count: 0 }
    line.count += 1
    lines.set(key, line)
  }
  return [...lines.values()].sort((a, b) => SEVERITY[a.kind] - SEVERITY[b.kind])
}

export const reached = (run: Run) => run.intents.filter((i) => i.status === 'completed').length

export const outcome = (name: string, run: Run): I18nString => {
  if (run.status === 'failed') return m.virtual_users__outcome_stopped({ name })
  if (run.intents.length === 0) return m.virtual_users__outcome_looked({ name })
  const r = reached(run)
  return r === run.intents.length
    ? m.virtual_users__outcome_all({ name })
    : r === 0
      ? m.virtual_users__outcome_none({ name })
      : m.virtual_users__outcome_some({ name, reached: r, total: run.intents.length })
}

export const ago = (iso: string): I18nString => {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const f = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [u, n] of [['day', 86_400], ['hour', 3_600], ['minute', 60]] as const) {
    if (Math.abs(s) >= n) {
      const text = f.format(Math.round(s / n), u)
      return asI18n(text)
    }
  }
  return m.virtual_users__just_now()
}

export const useVirtualUsers = (key: string) => {
  const meta = useProjectQuery<{ personas?: Record<string, Persona>; functions?: { name: string }[] }>(key, 'console:getAllMeta', {})
  const runs = useProjectQuery<Run[]>(key, 'console:getVirtualUserRuns', { limit: 100, offset: 0 }, { refetchInterval: 4000 })
  const schedules = useProjectQuery<Schedule[]>(key, 'console:getVirtualUserSchedules', {})
  const users: VirtualUser[] = Object.entries(meta.data?.personas ?? {})
    .filter(([, p]) => p.runnable !== false)
    .map(([id, p]) => {
      const mine = (runs.data ?? []).filter((r) => r.persona === (p.id ?? id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const name = p.name
      const job = p.jobTitle
      const description = p.description
      return {
        id: p.id ?? id,
        name: asI18n(name),
        job: job ? asI18n(job) : undefined,
        description: description ? asI18n(description) : undefined,
        disposition: p.disposition ?? 'realistic',
        goals: (p.goals ?? []).map((goal) => asI18n(goal)),
        roles: p.roles ?? [],
        visits: mine.filter((r) => r.status !== 'running'),
        visiting: mine.some((r) => r.status === 'running'),
        schedule: schedules.data?.find((s) => s.persona === (p.id ?? id)),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  const ready = !meta.data?.functions || meta.data.functions.some((f) => /(^|[:.])runVirtualUser$/.test(f.name))
  return { users, meta, runs, ready }
}
