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
  name: string
  job?: string
  description?: string
  disposition: Disposition
  goals: string[]
  roles: string[]
  visits: Run[]
  visiting: boolean
  schedule?: Schedule
}

export const KIND: Record<Disposition, [string, string]> = {
  realistic: ['Capable', 'Knows what they want and gets on with it.'],
  careless: ['Distracted', 'Rushes, skips things and clicks twice when unsure.'],
  newcomer: ['First-timer', 'Has never seen your app and has to work it out.'],
  stale: ['Back after a while', 'Remembers an older version of your app.'],
  auditor: ['Checker', 'Only looks around and never changes anything.'],
  adversarial: ['Rule tester', 'Tries things they should not be allowed to do.'],
  accountable: ['Does real work', 'Carries out real tasks, even on your live site.'],
}

export const GOAL_WORD: Record<string, string> = {
  completed: 'Managed it',
  stuck: 'Got stuck',
  abandoned: 'Gave up',
  suspended: 'Put it down',
  open: 'Did not get to it',
}

export const FOUND = (name: string, kind: FindingKind, detail: string) =>
  ({
    'server-error': `${name} hit an error on your site`,
    'transport-error': `${name} could not reach your site`,
    'schema-violation': `Your app gave ${name} a broken answer`,
    'unexpected-success': `${name} got into something they should not be allowed to`,
    custom: `${name}: ${detail}`,
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

export const outcome = (name: string, run: Run) => {
  if (run.status === 'failed') return `${name}'s visit stopped before it finished.`
  if (run.intents.length === 0) return `${name} looked around your app.`
  const r = reached(run)
  return r === run.intents.length ? `${name} managed everything they came to do.` : r === 0 ? `${name} did not manage what they came to do.` : `${name} managed ${r} of the ${run.intents.length} things they came to do.`
}

export const ago = (iso: string) => {
  const s = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
  const f = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
  for (const [u, n] of [['day', 86_400], ['hour', 3_600], ['minute', 60]] as const) if (Math.abs(s) >= n) return f.format(Math.round(s / n), u)
  return 'just now'
}

export const useVirtualUsers = (key: string) => {
  const meta = useProjectQuery<{ personas?: Record<string, Persona> }>(key, 'console:getAllMeta', {})
  const runs = useProjectQuery<Run[]>(key, 'console:getVirtualUserRuns', { limit: 100, offset: 0 }, { refetchInterval: 4000 })
  const schedules = useProjectQuery<Schedule[]>(key, 'console:getVirtualUserSchedules', {})
  const users: VirtualUser[] = Object.entries(meta.data?.personas ?? {})
    .filter(([, p]) => p.runnable !== false)
    .map(([id, p]) => {
      const mine = (runs.data ?? []).filter((r) => r.persona === (p.id ?? id)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      return {
        id: p.id ?? id,
        name: p.name,
        job: p.jobTitle,
        description: p.description,
        disposition: p.disposition ?? 'realistic',
        goals: p.goals ?? [],
        roles: p.roles ?? [],
        visits: mine.filter((r) => r.status !== 'running'),
        visiting: mine.some((r) => r.status === 'running'),
        schedule: schedules.data?.find((s) => s.persona === (p.id ?? id)),
      }
    })
    .sort((a, b) => a.name.localeCompare(b.name))
  return { users, meta, runs }
}
