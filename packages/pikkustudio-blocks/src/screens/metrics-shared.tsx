import { asI18n, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useMemo, useState } from 'react'

export type Metric = {
  id: number
  at: number
  kind: 'invocation' | 'process'
  wireType: string | null
  wireId: string | null
  outcome: string | null
  durationMs: number | null
  errorMessage: string | null
  cpuPct: number | null
  memMb: number | null
}

export const ranges = (): Array<[string, I18nString]> => [
  ['5', m.metrics_shared__last_5_minutes()],
  ['60', m.metrics_shared__last_hour()],
  ['1440', m.metrics_shared__last_day()],
]

export const BARS = 40
export const FAILED_LIMIT = 500

export const kept = (previous: unknown) => previous

export const words = (raw: string) => {
  const spaced = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_:.]+/g, ' ').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export const nameOf = (metric: Pick<Metric, 'wireType' | 'wireId'>) => {
  const id = metric.wireId ?? 'unknown'
  if (metric.wireType === 'http') {
    const segments = (id.split(':').slice(1).join(':') || id).split('/').filter(Boolean)
    return words(segments[segments.length - 1] ?? m.metrics_shared__home_page())
  }
  return words(id.split(':').pop() ?? id)
}

export const reason = (raw: string | null) => {
  const first = (raw ?? '').split('\n')[0]!.trim().replace(/[:;,\s]+$/, '')
  return first || m.metrics_shared__no_reason()
}

export const explain = (why: string): I18nString => {
  if (/authentication required|not signed in|unauthori[sz]ed/i.test(why)) return m.metrics_shared__explain_signed_out()
  if (/not found|no such|cannot find/i.test(why)) return m.metrics_shared__explain_missing()
  if (/stopped while starting|failed to start|could not start/i.test(why)) return m.metrics_shared__explain_start()
  if (/timeout|timed out|too long/i.test(why)) return m.metrics_shared__explain_slow()
  if (/permission|forbidden|not allowed/i.test(why)) return m.metrics_shared__explain_denied()
  return m.metrics_shared__explain_other()
}

export const seconds = (ms: number): I18nString => (ms < 1000 ? m.metrics_shared__ms({ n: Math.round(ms) }) : m.metrics_shared__seconds({ n: (ms / 1000).toFixed(ms < 10_000 ? 1 : 0) }))
export const speed = (ms: number): { word: I18nString; bar: string; text: string } =>
  ms < 1000
    ? { word: m.metrics_shared__fast(), bar: 'bg-success', text: 'text-success' }
    : ms < 3000
      ? { word: m.metrics_shared__a_little_slow(), bar: 'bg-warning', text: 'text-warning' }
      : { word: m.metrics_shared__slow(), bar: 'bg-destructive', text: 'text-destructive' }
export const memory = (mb: number): I18nString => {
  const text =
    mb >= 1024
      ? new Intl.NumberFormat(undefined, { style: 'unit', unit: 'gigabyte', unitDisplay: 'short', maximumFractionDigits: 1 }).format(mb / 1024)
      : new Intl.NumberFormat(undefined, { style: 'unit', unit: 'megabyte', unitDisplay: 'short', maximumFractionDigits: 0 }).format(mb)
  return asI18n(text)
}
export const busyWord = (pct: number): I18nString => (pct < 25 ? m.metrics_shared__relaxed() : pct < 60 ? m.metrics_shared__steady() : pct < 90 ? m.metrics_shared__busy() : m.metrics_shared__flat_out())
export const clock = (at: number): I18nString => {
  const time = new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  return asI18n(time)
}

export function Figure({ label, value, note }: { label: I18nString; value: I18nString | number; note: I18nString }) {
  return (
    <div className="min-w-0">
      <div className="text-px14 font-semibold text-hero-ink-2">{label}</div>
      <div className="text-px26 font-bold text-hero-ink">{value}</div>
      <div className="text-px13 text-hero-ink-2">{note}</div>
    </div>
  )
}

export function Bars({ title, hue, points, from, to, top, say }: { title: I18nString; hue: string; points: Array<[number, number]>; from: number; to: number; top: number; say: (v: number) => string }) {
  const first = points[0]?.[0] ?? to
  const start = Math.max(from, first)
  const span = Math.max(1, to - start)
  const buckets = useMemo(() => {
    const sums = Array.from({ length: BARS }, () => [0, 0] as [number, number])
    for (const [at, v] of points) {
      const i = Math.min(BARS - 1, Math.max(0, Math.floor(((at - start) / span) * BARS)))
      sums[i]![0] += v
      sums[i]![1]++
    }
    return sums.map(([sum, n]) => (n ? sum / n : null))
  }, [points, start, span])
  const last = points[points.length - 1]
  const enough = points.length > 2 && to - first > 20_000
  return (
    <section className="rounded-empty border border-border bg-card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-px17 font-bold">{title}</h2>
        {last ? <span className="text-sm text-ink-2">{m.metrics_shared__right_now({ value: say(last[1]) })}</span> : null}
      </div>
      {enough ? (
        <>
          <div className="mt-5 flex h-28 items-end gap-0.5" data-hue={hue} role="img" aria-label={m.metrics_shared__bars_aria({ title, now: say(last![1]) })}>
            {buckets.map((v, i) => (
              <div key={i} className="flex h-full flex-1 items-end">
                <div className={v === null ? 'h-px w-full bg-border' : 'w-full rounded-t-sm bg-hero'} style={v === null ? undefined : { height: `${Math.max(4, Math.min(100, (v / top) * 100))}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-px13 text-muted-foreground">
            <span>{clock(start)}</span>
            <span>{m.metrics_shared__now()}</span>
          </div>
        </>
      ) : (
        <p className="mt-5 text-px15 text-muted-foreground">{m.metrics_shared__not_enough()}</p>
      )}
    </section>
  )
}

export function useRange() {
  const [range, setRange] = useState('60')
  const [tick, setTick] = useState(() => Math.floor(Date.now() / 5000))
  useEffect(() => {
    const t = setInterval(() => setTick(Math.floor(Date.now() / 5000)), 5000)
    return () => clearInterval(t)
  }, [])
  const to = tick * 5000
  return { range, setRange, to, from: to - Number(range) * 60_000 }
}

export const readMetrics = (q: { data?: unknown }) => ((q.data as { metrics: Metric[] } | undefined)?.metrics ?? []) as Metric[]

export type SummaryFunction = { name: string; wire: string | null; requests: number; errors: number; avgMs: number | null; lastRun: number | null }
export type SummaryFailure = { functionName: string; wire: string | null; message: string; count: number; last: number | null }
export type MetricsSummary = {
  totals: { requests: number; errors: number; avgMs: number | null; maxMs: number | null }
  traffic: Array<{ at: number; requests: number; errors: number; avgMs: number; maxMs: number }>
  functions: SummaryFunction[]
  failures: SummaryFailure[]
}

/** One failure, named and explained the way the Metrics screen talks about it. */
export type Problem = { name: string; why: string; count: number; last: number | null }

export const problemsOf = (failures: SummaryFailure[]): Problem[] => {
  const groups = new Map<string, Problem>()
  for (const f of failures) {
    const name = nameOf({ wireType: f.wire, wireId: f.functionName || null })
    const why = reason(f.message)
    const id = `${name}|${why}`
    const g = groups.get(id) ?? { name, why, count: 0, last: null }
    g.count += f.count
    g.last = f.last === null ? g.last : Math.max(g.last ?? 0, f.last)
    groups.set(id, g)
  }
  return [...groups.values()].sort((a, b) => (b.last ?? 0) - (a.last ?? 0))
}

/** Functions by the name people see, slowest on average first. */
export const slowestOf = (functions: SummaryFunction[]) => {
  const groups = new Map<string, { name: string; count: number; total: number }>()
  for (const f of functions) {
    if (f.avgMs === null || !f.requests) continue
    const name = nameOf({ wireType: f.wire, wireId: f.name })
    const g = groups.get(name) ?? { name, count: 0, total: 0 }
    g.count += f.requests
    g.total += f.avgMs * f.requests
    groups.set(name, g)
  }
  return [...groups.values()].map((g) => ({ name: g.name, count: g.count, average: g.total / g.count })).sort((a, b) => b.average - a.average)
}

const HOUR = 3_600_000
const remoteRanges = (): Array<[string, I18nString]> => [
  ['1440', m.metrics_shared__last_day()],
  ['10080', m.metrics_live__last_week()],
]

/** The time window: minutes on this computer, days for a copy in the cloud, where numbers arrive by the hour. */
export function useMetricsWindow(remote: boolean) {
  const local = useRange()
  const [range, setRange] = useState('1440')
  const [to] = useState(() => Math.ceil(Date.now() / HOUR) * HOUR)
  if (!remote) return { ...local, options: ranges() }
  return { range, setRange, to, from: to - Number(range) * 60_000, options: remoteRanges() }
}
