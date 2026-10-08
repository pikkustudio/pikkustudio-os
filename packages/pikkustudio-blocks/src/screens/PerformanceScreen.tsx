import type { I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { PageHead } from '../blocks/PageHead'
import { Segmented } from '../blocks/Segmented'
import { Page } from '../blocks/Page'
import { NextCard } from '../blocks/NextCard'
import { Section } from '../blocks/Section'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { Art, Bars, Figure, busyWord, kept, memory, ranges, readMetrics, useRange } from './metrics-shared'


const slice = (from: number, to: number) => {
  const point = (a: number) => `${(100 + 84 * Math.sin(a)).toFixed(2)} ${(100 - 84 * Math.cos(a)).toFixed(2)}`
  return `M100 100 L${point(from)} A84 84 0 ${to - from > Math.PI ? 1 : 0} 1 ${point(to)} Z`
}

function DiskPie({ parts }: { parts: Array<{ label: I18nString; note: I18nString; mb: number; fill: string; dot: string }> }) {
  const total = parts.reduce((n, p) => n + p.mb, 0)
  let angle = 0
  const wedges = parts.map((p) => {
    const next = angle + (p.mb / total) * Math.PI * 2
    const d = slice(angle, next)
    angle = next
    return { ...p, d }
  })
  return (
    <div className="grid items-center gap-8 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]" data-hue="teal">
      <svg viewBox="0 0 200 200" role="img" aria-label={m.performance_screen__space_aria({ parts: parts.map((p) => `${p.label} ${memory(p.mb)}`).join(', ') })} className="mx-auto size-56">
        <circle cx="100" cy="100" r="92" className="fill-secondary" />
        {wedges.map((w) => (
          <path key={w.label} d={w.d} className={`${w.fill} stroke-card`} strokeWidth="4" strokeLinejoin="round" />
        ))}
      </svg>
      <ul className="flex flex-col gap-4">
        {parts.map((p) => (
          <li key={p.label} className="flex items-start gap-3">
            <span className={`mt-1.5 size-3.5 shrink-0 rounded-full ${p.dot}`} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-px16 font-semibold">{p.label}</span>
                <span className="text-px15 text-ink-2 tabular-nums">
                  {m.performance_screen__memory_share({ memory: memory(p.mb), percent: Math.round((p.mb / total) * 100) })}
                </span>
              </div>
              <div className="text-px14 text-muted-foreground">{p.note}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function PerformanceScreen() {
  const key = useProjectKey()
  const { range, setRange, from, to } = useRange()
  const process = usePikkuQuery('studio:projectMetrics', { key, kind: 'process', since: from, limit: 1000 }, { enabled: !!key, placeholderData: kept } as never)
  const samples = useMemo(() => [...readMetrics(process)].sort((a, b) => a.at - b.at), [process.data])

  const disk = usePikkuQuery('studio:projectDisk', { key }, { enabled: !!key, staleTime: 60_000, refetchOnWindowFocus: false } as never)
  const space = (disk.data as { packagesMb: number; codeMb: number; mediaMb: number; otherMb: number; freeMb: number; skipped: number } | undefined) ?? null
  const latest = samples[samples.length - 1]
  const busy = samples.filter((s) => s.cpuPct !== null).map((s) => [s.at, s.cpuPct!] as [number, number])
  const mem = samples.filter((s) => s.memMb !== null).map((s) => [s.at, s.memMb!] as [number, number])
  const peakBusy = busy.reduce((n, p) => Math.max(n, p[1]), 0)
  const peakMem = mem.reduce((n, p) => Math.max(n, p[1]), 0)
  const hot = latest?.cpuPct != null && latest.cpuPct >= 60
  const heavy = latest?.memMb != null && latest.memMb >= 1536
  const diskParts = [
    { label: m.performance_screen__part_packages(), note: m.performance_screen__part_packages_note(), mb: space?.packagesMb ?? 0, fill: 'fill-w3', dot: 'bg-w3' },
    { label: m.performance_screen__part_code(), note: m.performance_screen__part_code_note(), mb: space?.codeMb ?? 0, fill: 'fill-coral', dot: 'bg-coral' },
    { label: m.performance_screen__part_media(), note: m.performance_screen__part_media_note(), mb: space?.mediaMb ?? 0, fill: 'fill-w2', dot: 'bg-w2' },
    { label: m.performance_screen__part_other(), note: m.performance_screen__part_other_note(), mb: space?.otherMb ?? 0, fill: 'fill-w5', dot: 'bg-w5' },
  ]
  const diskUsed = diskParts.reduce((n, p) => n + p.mb, 0)
  const verdict = hot ? m.performance_screen__verdict_hot() : heavy ? m.performance_screen__verdict_heavy() : m.performance_screen__verdict_ok()
  const detail = hot
    ? m.performance_screen__detail_hot()
    : heavy
      ? m.performance_screen__detail_heavy()
      : m.performance_screen__detail_ok()

  return (
    <Page gap="snug">
      <PageHead crumb={m.performance_screen__crumb()} title={m.performance_screen__title()} text={m.performance_screen__text()} size="lead">
        <Segmented label={m.performance_screen__time_range()} value={range} options={ranges()} onChange={setRange} />
      </PageHead>

      {!samples.length && !process.isLoading ? (
        <div className="flex flex-col items-center gap-3 rounded-empty border border-border bg-card px-6 py-14 text-center" data-testid="performance-empty">
          <Activity className="size-8 text-muted-foreground" />
          <p className="text-px17 font-semibold">{m.performance_screen__empty_title()}</p>
          <p className="max-w-[48ch] text-px15 text-ink-2">{m.performance_screen__empty_text()}</p>
        </div>
      ) : (
        <>
          <NextCard label={m.performance_screen__how_doing()} hue={hot || heavy ? 'petrol' : 'teal'} art={<Art calm={!hot && !heavy} />} title={verdict} why={detail}>
            <div className="mt-2 grid grid-cols-3 gap-6 border-t border-hero-ink/20 pt-5" data-testid="performance-cards">
              <Figure label={m.performance_screen__how_busy()} value={latest?.cpuPct != null ? busyWord(latest.cpuPct) : m.performance_screen__no_reading()} note={latest?.cpuPct != null ? m.performance_screen__note_cpu({ percent: Math.round(latest.cpuPct), peak: Math.round(peakBusy) }) : m.performance_screen__note_waiting()} />
              <Figure label={m.performance_screen__memory_in_use()} value={latest?.memMb != null ? memory(latest.memMb) : m.performance_screen__no_reading()} note={latest?.memMb != null ? m.performance_screen__note_peak({ memory: memory(peakMem) }) : m.performance_screen__note_waiting()} />
              <Figure label={m.performance_screen__space_used()} value={space ? memory(diskUsed) : m.performance_screen__measuring()} note={space ? m.performance_screen__note_free({ memory: memory(space.freeMb) }) : m.performance_screen__note_moment()} />
            </div>
          </NextCard>

          <Section title={m.performance_screen__over_time()} sub={m.performance_screen__over_time_sub()}>
            <div className="grid gap-4 lg:grid-cols-2">
              <Bars title={m.performance_screen__busy_title()} hue="teal" points={busy} from={from} to={to} top={Math.max(30, ...busy.map((p) => p[1]))} say={(v) => busyWord(v).toLowerCase()} />
              <Bars title={m.performance_screen__memory_in_use()} hue="petrol" points={mem} from={from} to={to} top={Math.max(...mem.map((p) => p[1]), 1) * 1.1} say={memory} />
            </div>
          </Section>

          <Section title={m.performance_screen__space_goes()} sub={m.performance_screen__space_goes_sub()}>
            <div className="rounded-empty border border-border bg-card p-6" data-testid="performance-disk">
              {space && diskUsed > 0 ? <><DiskPie parts={diskParts} />{space.skipped > 0 ? <p className="mt-5 text-px14 text-muted-foreground" data-testid="performance-skipped">{m.performance_screen__skipped({ n: space.skipped })}</p> : null}</> : <p className="text-px15 text-muted-foreground">{disk.isError ? m.performance_screen__measure_failed() : m.performance_screen__measuring()}</p>}
            </div>
          </Section>
        </>
      )}
    </Page>
  )
}
