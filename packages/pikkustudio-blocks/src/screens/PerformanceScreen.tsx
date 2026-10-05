import { useMemo } from 'react'
import { Activity } from 'lucide-react'
import { PageHead } from '../blocks/PageHead'
import { Segmented } from '../blocks/Segmented'
import { Page } from '../blocks/Page'
import { NextCard } from '../blocks/NextCard'
import { Section } from '../blocks/Section'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { sampleDisk } from './performance-sample'
import { Art, Bars, Figure, busyWord, kept, memory, ranges, readMetrics, useRange } from './metrics-shared'


const slice = (from: number, to: number) => {
  const point = (a: number) => `${(100 + 84 * Math.sin(a)).toFixed(2)} ${(100 - 84 * Math.cos(a)).toFixed(2)}`
  return `M100 100 L${point(from)} A84 84 0 ${to - from > Math.PI ? 1 : 0} 1 ${point(to)} Z`
}

function DiskPie({ parts }: { parts: Array<{ label: string; note: string; mb: number; fill: string; dot: string }> }) {
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
      <svg viewBox="0 0 200 200" role="img" aria-label={`Space used: ${parts.map((p) => `${p.label} ${memory(p.mb)}`).join(', ')}`} className="mx-auto size-56">
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
                  {memory(p.mb)} · {Math.round((p.mb / total) * 100)}%
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

  const latest = samples[samples.length - 1]
  const busy = samples.filter((s) => s.cpuPct !== null).map((s) => [s.at, s.cpuPct!] as [number, number])
  const mem = samples.filter((s) => s.memMb !== null).map((s) => [s.at, s.memMb!] as [number, number])
  const peakBusy = busy.reduce((n, p) => Math.max(n, p[1]), 0)
  const peakMem = mem.reduce((n, p) => Math.max(n, p[1]), 0)
  const hot = latest?.cpuPct != null && latest.cpuPct >= 60
  const heavy = latest?.memMb != null && latest.memMb >= 1536
  const diskParts = [
    { label: 'Installed packages', note: 'Tools your app borrows from other people. Safe to reinstall.', mb: sampleDisk.packagesMb, fill: 'fill-w3', dot: 'bg-w3' },
    { label: 'Your code', note: 'What you and the assistant have written.', mb: sampleDisk.codeMb, fill: 'fill-coral', dot: 'bg-coral' },
    { label: 'Pictures and files', note: 'Images, videos, fonts and other things that are not code.', mb: sampleDisk.mediaMb, fill: 'fill-w2', dot: 'bg-w2' },
    { label: 'History and build files', note: 'Saved versions and things made while building.', mb: sampleDisk.otherMb, fill: 'fill-w5', dot: 'bg-w5' },
  ]
  const diskUsed = diskParts.reduce((n, p) => n + p.mb, 0)
  const verdict = hot ? 'Working hard' : heavy ? 'Using a lot of memory' : 'Running comfortably'
  const detail = hot
    ? 'Your app is using most of what it can right now. It may feel slow until it settles.'
    : heavy
      ? 'Your app is holding on to a lot of memory. Restarting it usually clears this.'
      : 'Your app has plenty of room to spare.'

  return (
    <Page gap="snug">
      <PageHead crumb="While it runs" title="Performance" text="How hard your app is working and how much of your computer it is using." size="lead">
        <Segmented label="Time range" value={range} options={ranges} onChange={setRange} />
      </PageHead>

      {!samples.length && !process.isLoading ? (
        <div className="flex flex-col items-center gap-3 rounded-empty border border-border bg-card px-6 py-14 text-center" data-testid="performance-empty">
          <Activity className="size-8 text-muted-foreground" />
          <p className="text-px17 font-semibold">Start your project to see how it performs</p>
          <p className="max-w-[48ch] text-px15 text-ink-2">Once your app is running, you will see how hard it is working and how much memory it uses. If it is running already, try a longer time range.</p>
        </div>
      ) : (
        <>
          <NextCard label="How the app is doing" hue={hot || heavy ? 'petrol' : 'teal'} art={<Art calm={!hot && !heavy} />} title={verdict} why={detail}>
            <div className="mt-2 grid grid-cols-3 gap-6 border-t border-hero-ink/20 pt-5" data-testid="performance-cards">
              <Figure label="How busy it is" value={latest?.cpuPct != null ? busyWord(latest.cpuPct) : 'No reading yet'} note={latest?.cpuPct != null ? `About ${Math.round(latest.cpuPct)}% of what it can. Busiest: ${Math.round(peakBusy)}%` : 'Waiting for a reading'} />
              <Figure label="Memory in use" value={latest?.memMb != null ? memory(latest.memMb) : 'No reading yet'} note={latest?.memMb != null ? `Most it has used: ${memory(peakMem)}` : 'Waiting for a reading'} />
              <Figure label="Space used" value={memory(diskUsed)} note={`${memory(sampleDisk.freeMb)} still free on this computer`} />
            </div>
          </NextCard>

          <Section title="Over time" sub="Taller bars mean more. The right edge is now.">
            <div className="grid gap-4 lg:grid-cols-2">
              <Bars title="How busy it has been" hue="teal" points={busy} from={from} to={to} top={Math.max(30, ...busy.map((p) => p[1]))} say={(v) => busyWord(v).toLowerCase()} />
              <Bars title="Memory in use" hue="petrol" points={mem} from={from} to={to} top={Math.max(...mem.map((p) => p[1]), 1) * 1.1} say={memory} />
            </div>
          </Section>

          <Section title="Where the space goes" sub="What this project takes up on your computer. Sample numbers for now.">
            <div className="rounded-empty border border-border bg-card p-6" data-testid="performance-disk">
              <DiskPie parts={diskParts} />
            </div>
          </Section>
        </>
      )}
    </Page>
  )
}
