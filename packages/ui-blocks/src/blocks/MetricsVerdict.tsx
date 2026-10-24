import { m } from '@/i18n/messages'
import { useContext } from 'react'
import { NextCard } from './NextCard'
import { PikkuDot } from './PikkuDot'
import { CopyDetails } from './CopyDetails'
import { Button } from '../ui/button'
import { ShellCtx } from '../lib/shell'
import { Figure, explain, seconds, type MetricsSummary, type Problem } from '../screens/metrics-shared'

/** The answer first: did it work, and how fast, with a way to ask for a fix when something failed. */
export function MetricsVerdict({ scope, totals, problems }: { scope: 'app' | 'studio'; totals: MetricsSummary['totals']; problems: Problem[] }) {
  const { say } = useContext(ShellCtx)
  const failures = totals.errors
  const howMany = m.metrics_screen__how_many({ count: failures })
  const slowNow = totals.avgMs !== null && totals.avgMs > 2000
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
  return (
    <NextCard label={m.metrics_screen__how_answering()} hue={failures > 0 ? 'petrol' : 'teal'} page="metrics" title={verdict} why={detail}>
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
        <Figure label={m.metrics_screen__things_asked()} value={totals.requests} note={m.metrics_screen__in_this_time()} />
        <Figure label={m.metrics_screen__how_fast()} value={totals.avgMs != null ? seconds(totals.avgMs) : m.metrics_screen__nothing_yet()} note={m.metrics_screen__on_average()} />
        <Figure label={m.metrics_screen__slowest()} value={totals.maxMs != null ? seconds(totals.maxMs) : m.metrics_screen__nothing_yet()} note={m.metrics_screen__the_longest_it_took()} />
      </div>
    </NextCard>
  )
}
