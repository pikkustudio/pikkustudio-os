import { asI18n, sep, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { Activity, Globe, NotebookPen } from 'lucide-react'
import { PageHead } from '../blocks/PageHead'
import { Segmented } from '../blocks/Segmented'
import { Page } from '../blocks/Page'
import { NextCard } from '../blocks/NextCard'
import { Section } from '../blocks/Section'
import { EmptyState } from '../blocks/EmptyState'
import { ErrorState } from '../blocks/ErrorState'
import { StatusLine } from '../blocks/StatusLine'
import { AskPikku } from '../blocks/AskPikku'
import { PikkuDot } from '../blocks/PikkuDot'
import { RowCard, RowStack } from '../blocks/RowCard'
import { Link } from '../blocks/Link'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { keep } from '../lib/links'
import { useProjectKey } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { LOCAL_WORKSPACE, formatTarget, useProjectTarget } from '../lib/project-target'
import { useSlots, type LiveMetrics } from '../lib/slots'
import { Art, Bars, Figure, clock, seconds, speed, words } from './metrics-shared'

type UseLive = (name: string | null, hours: number) => LiveMetrics

const HOUR = 3_600_000
const liveRanges = (): Array<[string, I18nString]> => [
  ['24', m.metrics_shared__last_day()],
  ['168', m.metrics_live__last_week()],
]

/** Which copy the numbers come from. Shown only where the host has a published copy to read. */
export function LiveSwitch() {
  const { useLiveMetrics } = useSlots()
  return useLiveMetrics ? <Switch use={useLiveMetrics} /> : null
}

function Switch({ use }: { use: UseLive }) {
  const target = useProjectTarget()
  const navigate = useNavigate()
  const { site } = use(null, 24)
  if (!site && target.kind !== 'stage') return null
  const here = target.kind === 'workspace' && target.name !== LOCAL_WORKSPACE ? m.metrics_live__your_copy() : m.metrics_live__your_computer()
  const there = target.kind === 'stage' && target.name !== site ? asI18n(target.name) : m.metrics_live__live_site()
  const pick = (v: string) => {
    if (v === target.kind) return
    if (v === 'workspace') target.openWorkspace?.()
    else if (site) void navigate({ to: '.', search: ((prev: object) => ({ ...prev, target: formatTarget({ kind: 'stage', name: site }) })) as never })
  }
  return <Segmented label={m.metrics_live__which()} value={target.kind} options={[['workspace', here], ['stage', there]]} onChange={pick} />
}

function useLive(name: string, hours: number, use: UseLive) {
  const live = use(name, hours)
  return useMemo(() => {
    const requests = live.traffic.reduce((n, b) => n + b.requests, 0)
    const errors = live.traffic.reduce((n, b) => n + b.errors, 0)
    const weighted = live.traffic.reduce((n, b) => n + b.avgMs * b.requests, 0)
    const average = requests ? weighted / requests : null
    const slowest = live.traffic.reduce((n, b) => Math.max(n, b.maxMs), 0)
    const failing = live.functions.filter((f) => f.errors > 0).sort((a, b) => b.errors - a.errors)
    const slow = live.functions.filter((f) => f.avgMs !== null && f.requests > 0).sort((a, b) => b.avgMs! - a.avgMs!)
    return { live, requests, errors, average, slowest, failing, slow }
  }, [live])
}

function Gate({ live, head, children }: { live: LiveMetrics; head: I18nNode; children: () => I18nNode }) {
  const target = useProjectTarget()
  const back = target.openWorkspace ? (
    <Button variant="bordered" size="page" onClick={target.openWorkspace}>
      {m.metrics_live__back()}
    </Button>
  ) : null
  const body = live.isPending ? (
    <p className="h-24 animate-pulse rounded-card bg-secondary" aria-label={m.metrics_live__loading()} />
  ) : live.error ? (
    <ErrorState error={live.error} what={m.metrics_live__what()} onRetry={live.retry} retrying={live.isFetching} />
  ) : !live.found ? (
    <EmptyState icon={Globe} title={m.metrics_live__missing_title()} text={m.metrics_live__missing_text()}>
      {back}
    </EmptyState>
  ) : live.publishing && !live.published ? (
    <section className="flex flex-col gap-2 rounded-card border border-border bg-card px-6 py-5 shadow-card">
      <b className="text-[19px]">{m.metrics_live__publishing_title()}</b>
      <StatusLine tone="wait" text={m.metrics_live__publishing_text()} />
    </section>
  ) : !live.published ? (
    <EmptyState icon={Globe} title={m.metrics_live__never_title()} text={m.metrics_live__never_text()}>
      <Button asChild variant="bordered" size="page">
        <Link {...keep} to={'/publish' as never}>
          {m.metrics_live__go_publish()}
        </Link>
      </Button>
      {back}
    </EmptyState>
  ) : (
    children()
  )
  return (
    <Page gap="snug">
      {head}
      {body}
    </Page>
  )
}

function Quiet({ hours }: { hours: string }) {
  return (
    <EmptyState icon={Activity} title={m.metrics_live__quiet_title()} text={hours === '24' ? m.metrics_live__quiet_text_day() : m.metrics_live__quiet_text_week()} />
  )
}

const perHour = (v: number) => m.metrics_live__per_hour({ n: Math.round(v) })
const points = (live: LiveMetrics, pick: (b: LiveMetrics['traffic'][number]) => number | null) =>
  live.traffic.flatMap((b) => {
    const v = pick(b)
    return v === null ? [] : [[b.at, v] as [number, number]]
  })

export function LiveMetricsScreen({ name, use }: { name: string; use: UseLive }) {
  const { say } = useContext(ShellCtx)
  const [hours, setHours] = useState('24')
  const [showAll, setShowAll] = useState(false)
  const [to] = useState(() => Math.ceil(Date.now() / HOUR) * HOUR)
  const from = to - Number(hours) * HOUR
  const s = useLive(name, Number(hours), use)
  const head = (
    <PageHead crumb={m.metrics_screen__crumb_app()} title={m.metrics_screen__title_app()} text={m.metrics_live__text()} size="lead">
      <LiveSwitch />
      <Segmented label={m.metrics_screen__time_range()} value={hours} options={liveRanges()} onChange={setHours} />
    </PageHead>
  )
  return (
    <Gate live={s.live} head={head}>
      {() => {
        if (!s.requests)
          return (
            <>
              <Quiet hours={hours} />
              <AnalyticsEvents />
            </>
          )
        const slowNow = s.average !== null && s.average > 2000
        const verdict = s.errors > 0 ? m.metrics_screen__verdict_failed() : slowNow ? m.metrics_screen__verdict_slow() : m.metrics_screen__verdict_ok()
        const detail = s.errors > 0 ? m.metrics_live__detail_failed({ count: s.errors, total: s.requests }) : slowNow ? m.metrics_screen__detail_slow() : m.metrics_live__detail_ok()
        const fixPrompt = m.metrics_live__fix_prompt({ problems: s.failing.map((f) => m.metrics_live__fix_problem({ name: f.name, count: f.errors })).join(' ') })
        const topSlow = s.slow[0]?.avgMs ?? 1
        const shown = showAll ? s.slow : s.slow.slice(0, 5)
        return (
          <>
            <NextCard label={m.metrics_live__how_answering()} hue={s.errors > 0 ? 'petrol' : 'teal'} art={<Art calm={s.errors === 0} />} title={verdict} why={detail}>
              {s.errors > 0 ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Button variant="hero" size="pageLg" type="button" onClick={() => say(fixPrompt)}>
                    <PikkuDot />
                    {m.metrics_screen__fix_it()}
                  </Button>
                  <span className="text-px15 text-hero-ink-2">{m.metrics_live__assistant_note()}</span>
                </div>
              ) : null}
              <div className="mt-2 grid grid-cols-3 gap-6 border-t border-hero-ink/20 pt-5" data-testid="metrics-live-cards">
                <Figure label={m.metrics_live__visits()} value={s.requests} note={m.metrics_screen__in_this_time()} />
                <Figure label={m.metrics_screen__how_fast()} value={s.average !== null ? seconds(s.average) : m.metrics_screen__nothing_yet()} note={m.metrics_screen__on_average()} />
                <Figure label={m.metrics_screen__slowest()} value={seconds(s.slowest)} note={m.metrics_screen__the_longest_it_took()} />
              </div>
            </NextCard>

            <Section title={m.performance_screen__over_time()} sub={m.metrics_live__over_time_sub()}>
              <div className="grid gap-4 lg:grid-cols-2">
                <Bars title={m.metrics_live__visits()} hue="teal" points={points(s.live, (b) => b.requests)} from={from} to={to} top={Math.max(1, ...s.live.traffic.map((b) => b.requests))} say={perHour} />
                <Bars title={m.metrics_screen__how_fast()} hue="petrol" points={points(s.live, (b) => (b.requests ? b.avgMs : null))} from={from} to={to} top={Math.max(1, ...s.live.traffic.map((b) => b.avgMs)) * 1.1} say={seconds} />
              </div>
            </Section>

            <div className="grid gap-4 lg:grid-cols-2">
              <Section title={m.metrics_screen__longest_title()} sub={m.metrics_screen__longest_sub()}>
                <div className="rounded-empty border border-border bg-card p-5" data-testid="metrics-live-slowest">
                  {s.slow.length === 0 ? (
                    <p className="text-px15 text-muted-foreground">{m.metrics_screen__none_app()}</p>
                  ) : (
                    <ul className="flex flex-col gap-4">
                      {shown.map((f) => {
                        const fast = speed(f.avgMs!)
                        return (
                          <li key={f.name}>
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="min-w-0 truncate text-px15 font-semibold">{asI18n(f.name)}</span>
                              <span className="shrink-0 text-sm tabular-nums">
                                <span className={`font-semibold ${fast.text}`}>{fast.word}</span>
                                <span className="text-muted-foreground">{sep(' · ')}{seconds(f.avgMs!)}</span>
                              </span>
                            </div>
                            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" data-hue="teal">
                              <div className={`h-full rounded-full ${fast.bar}`} style={{ width: `${Math.max(3, (f.avgMs! / topSlow) * 100)}%` }} />
                            </div>
                            <div className="mt-1 text-px13 text-muted-foreground">{m.metrics_screen__happened({ count: f.requests })}</div>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                  {s.slow.length > 5 ? (
                    <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-4 text-px15 font-semibold text-hero hover:underline">
                      {showAll ? m.metrics_screen__show_fewer() : m.metrics_screen__show_more({ count: s.slow.length - 5 })}
                    </button>
                  ) : null}
                </div>
              </Section>

              <Section title={m.metrics_screen__wrong_title()} sub={m.metrics_live__wrong_sub()}>
                <div className="rounded-empty border border-border bg-card p-5" data-testid="metrics-live-errors">
                  {s.failing.length === 0 ? (
                    <p className="text-px15 text-muted-foreground">{m.metrics_screen__nothing_wrong()}</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-border">
                      {s.failing.slice(0, 6).map((f) => (
                        <li key={f.name} className="py-3 first:pt-0 last:pb-0">
                          <div className="flex items-baseline justify-between gap-3">
                            <span className="min-w-0 truncate text-px15 font-semibold">{asI18n(f.name)}</span>
                            {f.lastRun ? <span className="shrink-0 text-px13 text-muted-foreground">{m.metrics_live__last_at({ time: clock(f.lastRun) })}</span> : null}
                          </div>
                          <p className="mt-0.5 text-sm text-ink-2">{m.metrics_live__failed_of({ count: f.errors, total: f.requests })}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <AskPikku label={m.metrics_screen__fix_this()} prompt={m.metrics_live__fix_problem({ name: f.name, count: f.errors })} />
                            <Button asChild variant="ghost" size="compact">
                              <Link {...keep} to={'/logs' as never}>
                                {m.metrics_live__see_notes()}
                              </Link>
                            </Button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </Section>
            </div>

            <AnalyticsEvents />
          </>
        )
      }}
    </Gate>
  )
}

export function LivePerformanceScreen({ name, use }: { name: string; use: UseLive }) {
  const [hours, setHours] = useState('24')
  const [to] = useState(() => Math.ceil(Date.now() / HOUR) * HOUR)
  const from = to - Number(hours) * HOUR
  const s = useLive(name, Number(hours), use)
  const head = (
    <PageHead crumb={m.performance_screen__crumb()} title={m.performance_screen__title()} text={m.metrics_live__perf_text()} size="lead">
      <LiveSwitch />
      <Segmented label={m.performance_screen__time_range()} value={hours} options={liveRanges()} onChange={setHours} />
    </PageHead>
  )
  return (
    <Gate live={s.live} head={head}>
      {() => {
        if (!s.requests) return <Quiet hours={hours} />
        const hits = s.live.slowHits
        const slowNow = s.average !== null && s.average > 2000
        const verdict = hits > 0 ? m.metrics_live__perf_verdict_cut() : slowNow ? m.metrics_screen__verdict_slow() : m.performance_screen__verdict_ok()
        const detail = hits > 0 ? m.metrics_live__perf_detail_cut({ count: hits, limit: seconds(s.live.slowLimitMs) }) : slowNow ? m.metrics_screen__detail_slow() : m.metrics_live__perf_detail_ok()
        return (
          <>
            <NextCard label={m.performance_screen__how_doing()} hue={hits > 0 || slowNow ? 'petrol' : 'teal'} art={<Art calm={hits === 0 && !slowNow} />} title={verdict} why={detail}>
              {hits > 0 ? (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <AskPikku label={m.metrics_live__perf_fix()} prompt={m.metrics_live__perf_fix_prompt({ count: hits, limit: seconds(s.live.slowLimitMs), names: s.slow.slice(0, 3).map((f) => f.name).join(', ') })} size="page" />
                </div>
              ) : null}
              <div className="mt-2 grid grid-cols-3 gap-6 border-t border-hero-ink/20 pt-5" data-testid="performance-live-cards">
                <Figure label={m.metrics_live__visits()} value={s.requests} note={m.metrics_screen__in_this_time()} />
                <Figure label={m.metrics_screen__how_fast()} value={s.average !== null ? seconds(s.average) : m.metrics_screen__nothing_yet()} note={m.metrics_screen__on_average()} />
                <Figure label={m.metrics_live__cut_off()} value={hits} note={m.metrics_live__cut_off_note({ limit: seconds(s.live.slowLimitMs) })} />
              </div>
            </NextCard>

            <Section title={m.performance_screen__over_time()} sub={m.metrics_live__over_time_sub()}>
              <div className="grid gap-4 lg:grid-cols-2">
                <Bars title={m.metrics_screen__how_fast()} hue="teal" points={points(s.live, (b) => (b.requests ? b.avgMs : null))} from={from} to={to} top={Math.max(1, ...s.live.traffic.map((b) => b.avgMs)) * 1.1} say={seconds} />
                <Bars title={m.metrics_screen__slowest()} hue="petrol" points={points(s.live, (b) => (b.requests ? b.maxMs : null))} from={from} to={to} top={Math.max(1, ...s.live.traffic.map((b) => b.maxMs)) * 1.1} say={seconds} />
              </div>
            </Section>

            <Section title={m.metrics_live__perf_space_title()} sub={m.metrics_live__perf_space_sub()}>
              <div className="rounded-empty border border-border bg-card p-6">
                <StatusLine tone="ok" text={m.metrics_live__perf_space_text()} />
              </div>
            </Section>
          </>
        )
      }}
    </Gate>
  )
}

type EventMeta = { name: string; props?: Record<string, string> }

const kindOf = (schema: string): I18nString => {
  if (/\b(boolean|stringbool)\b/.test(schema)) return m.analytics_events__kind_yes_no()
  if (/\b(number|int|bigint|float)\b/.test(schema)) return m.analytics_events__kind_number()
  if (/\b(date|datetime|iso)\b/i.test(schema)) return m.analytics_events__kind_date()
  if (/\b(enum|literal|union)\b/.test(schema)) return m.analytics_events__kind_choice()
  if (/\b(array|set)\b/.test(schema)) return m.analytics_events__kind_list()
  if (/\b(string|email|url|uuid)\b/.test(schema)) return m.analytics_events__kind_text()
  return m.analytics_events__kind_other()
}

const list = (items: string[]) => new Intl.ListFormat(undefined, { style: 'long', type: 'conjunction' }).format(items)

/** The moments the app declares it writes down about people, read off the app's own declaration. */
export function AnalyticsEvents() {
  const key = useProjectKey()
  const meta = useProjectQuery<{ analyticsEvents?: Record<string, EventMeta> }>(key, 'console:getAllMeta', {})
  const events = Object.values(meta.data?.analyticsEvents ?? {}).sort((a, b) => a.name.localeCompare(b.name))
  return (
    <Section title={m.analytics_events__title()} sub={m.analytics_events__sub()}>
      {meta.isPending ? (
        <p className="h-16 animate-pulse rounded-card bg-secondary" aria-label={m.analytics_events__loading()} />
      ) : meta.error ? (
        <ErrorState error={meta.error} what={m.analytics_events__what()} onRetry={() => void meta.refetch()} retrying={meta.isFetching} />
      ) : events.length === 0 ? (
        <p className="rounded-card border border-border bg-card px-5 py-4 text-px15 text-ink-2" data-testid="analytics-events-empty">
          {m.analytics_events__none()}
        </p>
      ) : (
        <RowStack>
          {events.map((e) => {
            const props = Object.entries(e.props ?? {})
            const caption = !e.props
              ? m.analytics_events__props_unknown()
              : props.length === 0
                ? m.analytics_events__props_none()
                : m.analytics_events__props({ list: list(props.map(([n, s]) => m.analytics_events__prop({ name: words(n).toLowerCase(), kind: kindOf(s) }))) })
            return <RowCard key={e.name} tile={<NotebookPen className="size-5" />} title={asI18n(words(e.name))} caption={caption} />
          })}
        </RowStack>
      )}
    </Section>
  )
}
