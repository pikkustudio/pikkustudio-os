import { asI18n, sep, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
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
import { useProjectTarget } from '../lib/project-target'
import { useSlots } from '../lib/slots'
import { AnalyticsEvents, LiveMetricsScreen, LiveSwitch } from './metrics-live'
import { Art, FAILED_LIMIT, Figure, clock, explain, kept, nameOf, ranges, readMetrics, reason, seconds, speed, useRange } from './metrics-shared'

function CopyDetails({ text, hero }: { text: I18nString; hero?: boolean }) {
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
      {done ? m.common__copied() : m.action_notice__copy()}
    </Button>
  )
}

export const StudioMetricsScreen = () => <MetricsScreen scope="studio" />

export function MetricsScreen({ scope = 'app' }: { scope?: 'app' | 'studio' }) {
  const target = useProjectTarget()
  const { useLiveMetrics } = useSlots()
  if (scope === 'app' && target.kind === 'stage' && useLiveMetrics) return <LiveMetricsScreen name={target.name} use={useLiveMetrics} />
  return <LocalMetrics scope={scope} />
}

function LocalMetrics({ scope }: { scope: 'app' | 'studio' }) {
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
  const howMany = failures >= FAILED_LIMIT ? m.metrics_screen__how_many_limit({ limit: FAILED_LIMIT }) : m.metrics_screen__how_many({ count: failures })
  const slowNow = stats.average !== null && stats.average > 2000
  const verdict = failures > 0 ? m.metrics_screen__verdict_failed() : slowNow ? m.metrics_screen__verdict_slow() : m.metrics_screen__verdict_ok()
  const top = [...problems].sort((a, b) => b.count - a.count)[0]
  const detail =
    failures > 0
      ? top
        ? m.metrics_screen__detail_failed_why({ howMany, why: explain(top.why) })
        : m.metrics_screen__detail_failed({ howMany })
      : slowNow
        ? m.metrics_screen__detail_slow()
        : m.metrics_screen__detail_ok()
  const fixPrompt = m.metrics_screen__fix_prompt({
    where: scope === 'studio' ? m.metrics_screen__fix_where_studio() : m.metrics_screen__fix_where_project(),
    howMany,
    problems: problems.map((p) => m.metrics_screen__fix_problem({ name: p.name, count: p.count, why: p.why })).join(' '),
  })
  const topSlow = stats.slow[0] ? stats.slow[0].total / stats.slow[0].count : 1
  const shown = showAll ? stats.slow : stats.slow.slice(0, 5)

  return (
    <Page gap="snug">
      <PageHead crumb={scope === 'studio' ? m.metrics_screen__crumb_studio() : m.metrics_screen__crumb_app()} title={scope === 'studio' ? m.metrics_screen__title_studio() : m.metrics_screen__title_app()} text={scope === 'studio' ? m.metrics_screen__text_studio() : m.metrics_screen__text_app()} size="lead">
        {scope === 'app' ? <LiveSwitch /> : null}
        <Segmented label={m.metrics_screen__time_range()} value={range} options={ranges()} onChange={setRange} />
      </PageHead>

      {!all.length && !calls.isLoading ? (
        <div className="flex flex-col items-center gap-3 rounded-empty border border-border bg-card px-6 py-14 text-center" data-testid="metrics-empty">
          <Activity className="size-8 text-muted-foreground" />
          <p className="text-px17 font-semibold">{m.metrics_screen__empty_title()}</p>
          <p className="max-w-[48ch] text-px15 text-ink-2">{m.metrics_screen__empty_text()}</p>
        </div>
      ) : (
        <>
          <NextCard label={m.metrics_screen__how_answering()} hue={failures > 0 ? 'petrol' : 'teal'} art={<Art calm={failures === 0} />} title={verdict} why={detail}>
            {failures > 0 ? (
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                {scope === 'studio' ? (
                  <>
                    <CopyDetails hero text={fixPrompt} />
                    <span className="text-px15 text-hero-ink-2">{m.metrics_screen__studio_note()}</span>
                  </>
                ) : (
                  <>
                    <Button variant="hero" size="pageLg" type="button" onClick={() => say(fixPrompt)}>
                      <PikkuDot />
                      {m.metrics_screen__fix_it()}
                    </Button>
                    <span className="text-px15 text-hero-ink-2">{m.metrics_screen__assistant_note()}</span>
                  </>
                )}
              </div>
            ) : null}
            <div className="mt-2 grid grid-cols-3 gap-6 border-t border-hero-ink/20 pt-5" data-testid="metrics-cards">
              <Figure label={m.metrics_screen__things_asked()} value={stats.count} note={m.metrics_screen__in_this_time()} />
              <Figure label={m.metrics_screen__how_fast()} value={stats.average != null ? seconds(stats.average) : m.metrics_screen__nothing_yet()} note={m.metrics_screen__on_average()} />
              <Figure label={m.metrics_screen__slowest()} value={stats.count ? seconds(stats.slowest) : m.metrics_screen__nothing_yet()} note={m.metrics_screen__the_longest_it_took()} />
            </div>
          </NextCard>

          <div className="grid gap-4 lg:grid-cols-2">
            <Section title={m.metrics_screen__longest_title()} sub={m.metrics_screen__longest_sub()}>
              <div className="rounded-empty border border-border bg-card p-5" data-testid="metrics-slowest">
                {stats.slow.length === 0 ? (
                  <p className="text-px15 text-muted-foreground">{scope === 'studio' ? m.metrics_screen__none_studio() : m.metrics_screen__none_app()}</p>
                ) : (
                  <ul className="flex flex-col gap-4">
                    {shown.map((s) => {
                      const average = s.total / s.count
                      const fast = speed(average)
                      return (
                        <li key={s.name}>
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-px15 font-semibold">{asI18n(s.name)}</span>
                            <span className="shrink-0 text-sm tabular-nums">
                              <span className={`font-semibold ${fast.text}`}>{fast.word}</span>
                              <span className="text-muted-foreground">{sep(' · ')}{seconds(average)}</span>
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" data-hue="teal">
                            <div className={`h-full rounded-full ${fast.bar}`} style={{ width: `${Math.max(3, (average / topSlow) * 100)}%` }} />
                          </div>
                          <div className="mt-1 text-px13 text-muted-foreground">{m.metrics_screen__happened({ count: s.count })}</div>
                        </li>
                      )
                    })}
                  </ul>
                )}
                {stats.slow.length > 5 ? (
                  <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-4 text-px15 font-semibold text-hero hover:underline" data-testid="metrics-slowest-more">
                    {showAll ? m.metrics_screen__show_fewer() : m.metrics_screen__show_more({ count: stats.slow.length - 5 })}
                  </button>
                ) : null}
              </div>
            </Section>

            <Section title={m.metrics_screen__wrong_title()} sub={m.metrics_screen__wrong_sub()}>
              <div className="rounded-empty border border-border bg-card p-5" data-testid="metrics-errors">
                {problems.length === 0 ? (
                  <p className="text-px15 text-muted-foreground">{m.metrics_screen__nothing_wrong()}</p>
                ) : (
                  <ul className="flex flex-col divide-y divide-border">
                    {problems.map((p) => (
                      <li key={`${p.name}|${p.why}`} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="min-w-0 truncate text-px15 font-semibold">{asI18n(p.name)}</span>
                          <span className="shrink-0 text-px13 text-muted-foreground">{p.count > 1 ? m.metrics_screen__times_last({ count: p.count, time: clock(p.last) }) : clock(p.last)}</span>
                        </div>
                        <p className="mt-0.5 text-sm text-ink-2">{explain(p.why)}</p>
                        <p className="mt-0.5 line-clamp-2 text-px13 text-muted-foreground">{m.metrics_screen__it_said({ why: p.why })}</p>
                        <div className="mt-2">
                          {scope === 'studio' ? (
                            <CopyDetails text={m.metrics_screen__studio_failed({ name: p.name, count: p.count, why: p.why })} />
                          ) : (
                            <AskPikku label={m.metrics_screen__fix_this()} prompt={m.metrics_screen__failed_times_with_please_find({ name: p.name, count: p.count, why: p.why })} />
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
      {scope === 'app' ? <AnalyticsEvents /> : null}
    </Page>
  )
}
