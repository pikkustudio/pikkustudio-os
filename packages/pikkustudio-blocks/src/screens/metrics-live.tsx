import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useContext, useMemo, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { NotebookPen } from 'lucide-react'
import { PageHead } from '../blocks/PageHead'
import { Segmented } from '../blocks/Segmented'
import { Page } from '../blocks/Page'
import { NextCard } from '../blocks/NextCard'
import { Section } from '../blocks/Section'
import { ErrorState, detailsOf, faultOf } from '../blocks/ErrorState'
import { StatusLine } from '../blocks/StatusLine'
import { AskPikku } from '../blocks/AskPikku'
import { PikkuDot } from '../blocks/PikkuDot'
import { RowCard, RowStack } from '../blocks/RowCard'
import { Link } from '../blocks/Link'
import { Button, buttonVariants } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { keep } from '../lib/links'
import { useProjectKey } from '../lib/project'
import { useProjectQuery } from '../lib/projectRpc'
import { LOCAL_WORKSPACE, formatTarget, useProjectTarget } from '../lib/project-target'
import { useSlots, type AnalyticsEventCount, type AnalyticsEventCounts, type LiveMetrics } from '../lib/slots'
import { getLocale } from '@/paraglide/runtime.js'
import { Bars, Figure, seconds, words } from './metrics-shared'

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

function Gate({ live, head, label, children }: { live: LiveMetrics; head: I18nNode; label: I18nString; children: () => I18nNode }) {
  const target = useProjectTarget()
  const { say } = useContext(ShellCtx)
  const hero = (title: I18nString, why: I18nString, actions?: I18nNode, calm = true) => (
    <NextCard label={label} hue={calm ? 'teal' : 'petrol'} page="metrics" title={title} why={why}>
      {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
    </NextCard>
  )
  const back = target.openWorkspace ? (
    <Button variant="heroGhost" size="page" onClick={target.openWorkspace}>
      {m.metrics_live__back()}
    </Button>
  ) : null
  const body = live.isPending ? (
    <div role="status" aria-busy="true" className="flex flex-col gap-3.5">
      {hero(m.metrics_live__loading(), m.metrics_live__text())}
      <p className="h-24 animate-pulse rounded-card bg-secondary" aria-label={m.metrics_live__loading()} />
    </div>
  ) : live.error ? (
    <>
      {hero(
        m.metrics_live__error_title(),
        m.metrics_live__error_text(),
        <Button variant="hero" size="pageLg" type="button" onClick={() => say(m.error_state__fix_ask_what({ what: m.metrics_live__what(), details: detailsOf(faultOf(live.error), m.metrics_live__what()) }))}>
          <PikkuDot />
          {m.metrics_screen__fix_it()}
        </Button>,
        false,
      )}
      <ErrorState error={live.error} what={m.metrics_live__what()} onRetry={live.retry} retrying={live.isFetching} />
    </>
  ) : !live.found ? (
    hero(m.metrics_live__missing_title(), m.metrics_live__missing_text(), back)
  ) : live.publishing && !live.published ? (
    hero(m.metrics_live__publishing_title(), m.metrics_live__publishing_text(), <StatusLine tone="wait" text={m.metrics_live__publishing_title()} />)
  ) : !live.published ? (
    hero(
      m.metrics_live__never_title(),
      m.metrics_live__never_text(),
      <>
        <Link {...keep} to={'/publish' as never} className={buttonVariants({ variant: 'hero', size: 'page' })}>
          {m.metrics_live__go_publish()}
        </Link>
        {back}
      </>,
    )
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

function Quiet({ hours, label }: { hours: string; label: I18nString }) {
  return <NextCard label={label} hue="teal" page="metrics" title={m.metrics_live__quiet_title()} why={hours === '24' ? m.metrics_live__quiet_text_day() : m.metrics_live__quiet_text_week()} />
}

const points = (live: LiveMetrics, pick: (b: LiveMetrics['traffic'][number]) => number | null) =>
  live.traffic.flatMap((b) => {
    const v = pick(b)
    return v === null ? [] : [[b.at, v] as [number, number]]
  })

export function LivePerformanceScreen({ name, use }: { name: string; use: UseLive }) {
  const [hours, setHours] = useState('24')
  const [to] = useState(() => Math.ceil(Date.now() / HOUR) * HOUR)
  const from = to - Number(hours) * HOUR
  const s = useLive(name, Number(hours), use)
  const head = (
    <PageHead crumb={m.performance_screen__crumb()} title={m.performance_screen__title()} text={m.metrics_live__perf_text()} size="lead" developerDetails>
      <LiveSwitch />
      <Segmented label={m.performance_screen__time_range()} value={hours} options={liveRanges()} onChange={setHours} />
    </PageHead>
  )
  return (
    <Gate live={s.live} head={head} label={m.performance_screen__how_doing()}>
      {() => {
        if (!s.requests) return <Quiet hours={hours} label={m.performance_screen__how_doing()} />
        const hits = s.live.slowHits
        const slowNow = s.average !== null && s.average > 2000
        const verdict = hits > 0 ? m.metrics_live__perf_verdict_cut() : slowNow ? m.metrics_screen__verdict_slow() : m.performance_screen__verdict_ok()
        const detail = hits > 0 ? m.metrics_live__perf_detail_cut({ count: hits, limit: seconds(s.live.slowLimitMs) }) : slowNow ? m.metrics_screen__detail_slow() : m.metrics_live__perf_detail_ok()
        return (
          <>
            <NextCard label={m.performance_screen__how_doing()} hue={hits > 0 || slowNow ? 'petrol' : 'teal'} page="metrics" title={verdict} why={detail}>
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

const COUNT_DAYS = 30
const noCounts = (): AnalyticsEventCounts | null => null

const share = (c: AnalyticsEventCount): I18nString | null => {
  const part = c.signedIn / c.total
  if (!c.signedIn) return null
  if (part >= 0.95) return m.analytics_events__by_all()
  if (part >= 0.65) return m.analytics_events__by_most()
  if (part >= 0.35) return m.analytics_events__by_half()
  return m.analytics_events__by_some()
}

const countLine = (c: AnalyticsEventCount | undefined): I18nString => {
  if (!c?.total) return m.analytics_events__never()
  const line = m.analytics_events__count({ count: c.total, shown: new Intl.NumberFormat(getLocale()).format(c.total), days: COUNT_DAYS })
  const who = share(c)
  return who ? m.analytics_events__count_with({ count: line, who }) : line
}

/** The moments the app declares it writes down about people, read off the app's own declaration; on a published copy, how often each fired. */
export function AnalyticsEvents({ stage }: { stage?: string }) {
  const key = useProjectKey()
  const counts = (useSlots().useAnalyticsEventCounts ?? noCounts)(stage ?? null, COUNT_DAYS)
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
          {counts?.error ? (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-px15 text-ink-2" data-testid="analytics-events-counts-error">
              <span>{m.analytics_events__counts_failed()}</span>
              <Button variant="ghost" size="compact" type="button" disabled={counts.isFetching} onClick={counts.retry}>
                {m.analytics_events__counts_retry()}
              </Button>
            </div>
          ) : null}
          {events.map((e) => {
            const props = Object.entries(e.props ?? {})
            const caption = !e.props
              ? m.analytics_events__props_unknown()
              : props.length === 0
                ? m.analytics_events__props_none()
                : m.analytics_events__props({ list: list(props.map(([n, s]) => m.analytics_events__prop({ name: words(n).toLowerCase(), kind: kindOf(s) }))) })
            const note = counts && !counts.isPending && !counts.error ? countLine(counts.counts[e.name]) : undefined
            return <RowCard key={e.name} tile={<NotebookPen className="size-5" />} title={asI18n(words(e.name))} caption={caption} note={note} />
          })}
        </RowStack>
      )}
    </Section>
  )
}
