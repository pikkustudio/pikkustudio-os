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

export const ranges: Array<[string, string]> = [
  ['5', 'Last 5 minutes'],
  ['60', 'Last hour'],
  ['1440', 'Last day'],
]

export const BARS = 40
export const FAILED_LIMIT = 500

export const kept = (previous: unknown) => previous

export const words = (raw: string) => {
  const spaced = raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[-_:.]+/g, ' ').trim().toLowerCase()
  return spaced.charAt(0).toUpperCase() + spaced.slice(1)
}

export const nameOf = (m: Pick<Metric, 'wireType' | 'wireId'>) => {
  const id = m.wireId ?? 'unknown'
  if (m.wireType === 'http') {
    const segments = (id.split(':').slice(1).join(':') || id).split('/').filter(Boolean)
    return words(segments[segments.length - 1] ?? 'Home page')
  }
  return words(id.split(':').pop() ?? id)
}

export const reason = (raw: string | null) => {
  const first = (raw ?? '').split('\n')[0]!.trim().replace(/[:;,\s]+$/, '')
  return first || 'It stopped without saying why'
}

export const explain = (why: string) => {
  if (/authentication required|not signed in|unauthori[sz]ed/i.test(why)) return 'Something asked for this without being signed in, so it was turned away.'
  if (/not found|no such|cannot find/i.test(why)) return 'Something asked for a page or item that does not exist.'
  if (/stopped while starting|failed to start|could not start/i.test(why)) return 'Your project could not start, so it never came up.'
  if (/timeout|timed out|too long/i.test(why)) return 'It took too long to answer and gave up.'
  if (/permission|forbidden|not allowed/i.test(why)) return 'It was not allowed to do this.'
  return 'Your app hit a problem it did not expect.'
}

export const seconds = (ms: number) => (ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(ms < 10_000 ? 1 : 0)} seconds`)
export const speed = (ms: number) =>
  ms < 1000
    ? { word: 'Fast', bar: 'bg-success', text: 'text-success' }
    : ms < 3000
      ? { word: 'A little slow', bar: 'bg-warning', text: 'text-warning' }
      : { word: 'Slow', bar: 'bg-destructive', text: 'text-destructive' }
export const memory = (mb: number) => (mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.round(mb)} MB`)
export const busyWord = (pct: number) => (pct < 25 ? 'Relaxed' : pct < 60 ? 'Working steadily' : pct < 90 ? 'Busy' : 'Working flat out')
export const clock = (at: number) => new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })

export function Art({ calm }: { calm: boolean }) {
  return (
    <>
      <circle cx="230" cy="50" r="120" className="fill-w1" />
      <circle cx="50" cy="190" r="100" className="fill-w2" />
      <rect x="92" y="120" width="26" height="46" rx="13" className="fill-w6" opacity="0.92" />
      <rect x="130" y="92" width="26" height="74" rx="13" className="fill-w6" opacity="0.92" />
      <rect x="168" y="106" width="26" height="60" rx="13" className="fill-w6" opacity="0.92" />
      <rect x="206" y="70" width="26" height="96" rx="13" className="fill-w6" opacity="0.92" />
      <circle cx="268" cy="168" r="9" className={calm ? 'fill-w3' : 'fill-coral'} />
    </>
  )
}

export function Figure({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="min-w-0">
      <div className="text-px14 font-semibold text-hero-ink-2">{label}</div>
      <div className="text-px26 font-bold text-hero-ink">{value}</div>
      <div className="text-px13 text-hero-ink-2">{note}</div>
    </div>
  )
}

export function Bars({ title, hue, points, from, to, top, say }: { title: string; hue: string; points: Array<[number, number]>; from: number; to: number; top: number; say: (v: number) => string }) {
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
        {last ? <span className="text-sm text-ink-2">Right now: {say(last[1])}</span> : null}
      </div>
      {enough ? (
        <>
          <div className="mt-5 flex h-28 items-end gap-0.5" data-hue={hue} role="img" aria-label={`${title} over time. Right now ${say(last![1])}.`}>
            {buckets.map((v, i) => (
              <div key={i} className="flex h-full flex-1 items-end">
                <div className={v === null ? 'h-px w-full bg-border' : 'w-full rounded-t-sm bg-hero'} style={v === null ? undefined : { height: `${Math.max(4, Math.min(100, (v / top) * 100))}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-px13 text-muted-foreground">
            <span>{clock(start)}</span>
            <span>Now</span>
          </div>
        </>
      ) : (
        <p className="mt-5 text-px15 text-muted-foreground">Not enough yet. This fills in as your app keeps running.</p>
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
