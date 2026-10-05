import { useContext, useMemo, useState } from 'react'
import { Activity, Check, Copy } from 'lucide-react'
import { PageHead } from '../blocks/PageHead'
import { Segmented } from '../blocks/Segmented'
import { Page } from '../blocks/Page'
import { NextCard } from '../blocks/NextCard'
import { Section } from '../blocks/Section'
import { AskPikku } from '../blocks/AskPikku'
import { PikkuDot } from '../blocks/PikkuDot'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { useProjectKey } from '../lib/project'
import { Art, FAILED_LIMIT, Figure, clock, explain, kept, nameOf, ranges, readMetrics, reason, seconds, speed, useRange } from './metrics-shared'

function CopyDetails({ text, hero }: { text: string; hero?: boolean }) {
  const [done, setDone] = useState(false)
  return (
    <Button
      variant={hero ? 'hero' : 'bordered'}
      size={hero ? 'pageLg' : 'compact'}
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true)
          setTimeout(() => setDone(false), 2000)
        })
      }}
    >
      {done ? <Check className="size-4" /> : <Copy className="size-4" />}
      {done ? 'Copied' : 'Copy the details'}
    </Button>
  )
}

export const StudioMetricsScreen = () => <MetricsScreen scope="studio" />

export function MetricsScreen({ scope = 'app' }: { scope?: 'app' | 'studio' }) {
  const projectKey = useProjectKey()
  const key = scope === 'studio' ? 'studio' : projectKey
  const { say } = useContext(ShellCtx)
  const { range, setRange, from } = useRange()
  const opts = { enabled: !!key, placeholderData: kept } as never
  const [showAll, setShowAll] = useState(false)
  const calls = usePikkuQuery('studio:projectMetrics', { key, kind: 'invocation', since: from, limit: 2000 }, opts)
  const failed = usePikkuQuery('studio:projectMetrics', { key, kind: 'invocation', outcome: 'error', since: from, limit: FAILED_LIMIT }, opts)
  const all = readMetrics(calls)
  const errors = readMetrics(failed)

  const stats = useMemo(() => {
    const timed = all.filter((c) => c.durationMs !== null)
    const groups = new Map<string, { name: string; count: number; total: number }>()
    for (const c of timed) {
      const name = nameOf(c)
      const g = groups.get(name) ?? { name, count: 0, total: 0 }
      g.count++
      g.total += c.durationMs!
      groups.set(name, g)
    }
    return {
      average: timed.length ? timed.reduce((n, c) => n + c.durationMs!, 0) / timed.length : null,
      slowest: timed.reduce((n, c) => Math.max(n, c.durationMs!), 0),
      slow: [...groups.values()].sort((a, b) => b.total / b.count - a.total / a.count),
      count: all.length,
    }
  }, [calls.data])

  const problems = useMemo(() => {
    const groups = new Map<string, { name: string; why: string; count: number; last: number }>()
    for (const e of errors) {
      const name = nameOf(e)
      const why = reason(e.errorMessage)
      const id = `${name}|${why}`
      const g = groups.get(id) ?? { name, why, count: 0, last: 0 }
      g.count++
      g.last = Math.max(g.last, e.at)
      groups.set(id, g)
    }
    return [...groups.values()].sort((a, b) => b.last - a.last).slice(0, 6)
  }, [failed.data])

  const failures = errors.length
  const howMany = failures >= FAILED_LIMIT ? `More than ${FAILED_LIMIT} things` : failures === 1 ? 'One thing' : `${failures} things`
  const slowNow = stats.average !== null && stats.average > 2000
  const verdict = failures > 0 ? 'A few things went wrong' : slowNow ? 'Answering a little slowly' : 'Answering well'
  const top = [...problems].sort((a, b) => b.count - a.count)[0]
  const detail =
    failures > 0
      ? `${howMany} failed in this time.${top ? ` ${explain(top.why)}` : ''}`
      : slowNow
        ? 'Some things are taking a while to answer. The slowest are listed below.'
        : 'Nothing has failed and answers are coming back quickly.'
  const fixPrompt = `Something is going wrong ${scope === 'studio' ? 'in Pikku Studio' : 'in my project'}. ${howMany} failed recently. ${problems.map((p) => `${p.name} failed ${p.count} times with: ${p.why}.`).join(' ')} Please find out why and fix it, then tell me in plain words what you changed.`
  const topSlow = stats.slow[0] ? stats.slow[0].total / stats.slow[0].count : 1
  const shown = showAll ? stats.slow : stats.slow.slice(0, 5)

  return (
    <Page gap="snug">
      <PageHead crumb={scope === 'studio' ? 'Pikku Studio' : 'While it runs'} title={scope === 'studio' ? 'Studio metrics' : 'App metrics'} text={scope === 'studio' ? 'How Pikku Studio itself is doing. This is about the tool, not any one project.' : 'What your app has been asked to do, how quickly it answered, and what went wrong.'} size="lead">
        <Segmented label="Time range" value={range} options={ranges} onChange={setRange} />
      </PageHead>

      {!all.length && !calls.isLoading ? (
        <div className="flex flex-col items-center gap-3 rounded-empty border border-border bg-card px-6 py-14 text-center" data-testid="metrics-empty">
          <Activity className="size-8 text-muted-foreground" />
          <p className="text-px17 font-semibold">Nothing has been asked of your app yet</p>
          <p className="max-w-[48ch] text-px15 text-ink-2">Once your app is running and someone uses it, you will see how quickly it answers and anything that went wrong. If it is running already, try a longer time range.</p>
        </div>
      ) : (
        <>
          <NextCard label="How the app is answering" hue={failures > 0 ? 'petrol' : 'teal'} art={<Art calm={failures === 0} />} title={verdict} why={detail}>
            {failures > 0 ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {scope === 'studio' ? (
                  <>
                    <CopyDetails hero text={fixPrompt} />
                    <span className="text-px15 text-hero-ink-2">This is about Studio itself, not your project. Copy this to share it with the Pikku team.</span>
                  </>
                ) : (
                  <>
                    <Button variant="hero" size="pageLg" type="button" onClick={() => say(fixPrompt)}>
                      <PikkuDot />
                      Fix this for me
                    </Button>
                    <span className="text-px15 text-hero-ink-2">The assistant will look into it and tell you what it did.</span>
                  </>
                )}
              </div>
            ) : null}
            <div className="mt-2 grid grid-cols-3 gap-6 border-t border-hero-ink/20 pt-5" data-testid="metrics-cards">
              <Figure label="Things asked of it" value={String(stats.count)} note="In this time" />
              <Figure label="How fast it answers" value={stats.average != null ? seconds(stats.average) : 'Nothing yet'} note="On average" />
              <Figure label="Slowest answer" value={stats.count ? seconds(stats.slowest) : 'Nothing yet'} note="The longest it took" />
            </div>
          </NextCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title="What takes the longest" sub="Average time to answer, slowest first.">
              <div className="rounded-empty border border-border bg-card p-5" data-testid="metrics-slowest">
                {stats.slow.length === 0 ? (
                  <p className="text-px15 text-muted-foreground">{scope === 'studio' ? 'Studio has not been asked anything in this time.' : 'Nothing has been asked of your app in this time.'}</p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {shown.map((s) => {
                      const average = s.total / s.count
                      const fast = speed(average)
                      return (
                        <li key={s.name}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-px15 font-semibold">{s.name}</span>
                            <span className="shrink-0 text-sm tabular-nums">
                              <span className={`font-semibold ${fast.text}`}>{fast.word}</span>
                              <span className="text-muted-foreground"> · {seconds(average)}</span>
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" data-hue="teal">
                            <div className={`h-full rounded-full ${fast.bar}`} style={{ width: `${Math.max(3, (average / topSlow) * 100)}%` }} />
                          </div>
                          <div className="mt-1 text-px13 text-muted-foreground">{s.count === 1 ? 'Happened once' : `Happened ${s.count} times`}</div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {stats.slow.length > 5 ? (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-4 text-px15 font-semibold text-hero hover:underline" data-testid="metrics-slowest-more">
                    {showAll ? 'Show fewer' : `Show ${stats.slow.length - 5} more`}
                  </button>
                ) : null}
              </div>
            </Section>

            <Section title="Things that went wrong" sub="The most recent first. Repeats are grouped.">
              <div className="rounded-empty border border-border bg-card p-5" data-testid="metrics-errors">
                {problems.length === 0 ? (
                  <p className="text-px15 text-muted-foreground">Nothing went wrong in this time. Nice.</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {problems.map((p) => (
                      <li key={`${p.name}|${p.why}`} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-px15 font-semibold">{p.name}</span>
                          <span className="shrink-0 text-px13 text-muted-foreground">{p.count > 1 ? `${p.count} times, last at ${clock(p.last)}` : clock(p.last)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-ink-2">{explain(p.why)}</p>
                        <p className="mt-0.5 line-clamp-2 text-px13 text-muted-foreground">It said: {p.why}</p>
                        <div className="mt-2">
                          {scope === 'studio' ? (
                            <CopyDetails text={`${p.name} failed ${p.count} times in Pikku Studio with: ${p.why}`} />
                          ) : (
                            <AskPikku label="Fix this" prompt={`${p.name} failed ${p.count} times with: ${p.why}. Please find out why and fix it, then tell me in plain words what you changed.`} />
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>
          </div>
        </>
      )}
    </Page>
  )
}
