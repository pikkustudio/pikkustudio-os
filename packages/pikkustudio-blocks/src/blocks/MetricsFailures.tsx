import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { Section } from './Section'
import { AskPikku } from './AskPikku'
import { CopyDetails } from './CopyDetails'
import { clock, explain, type Problem } from '../screens/metrics-shared'

/** What went wrong, newest first, each with what it said and a way to ask for a fix. */
export function MetricsFailures({ scope, problems }: { scope: 'app' | 'studio'; problems: Problem[] }) {
  return (
    <Section title={m.metrics_screen__wrong_title()} sub={m.metrics_screen__wrong_sub()}>
      <div className="rounded-empty border border-border bg-card p-5" data-testid="metrics-errors">
        {problems.length === 0 ? (
          <p className="text-px15 text-muted-foreground">{m.metrics_screen__nothing_wrong()}</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {problems.slice(0, 6).map((p) => (
              <li key={`${p.name}|${p.why}`} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate text-px15 font-semibold">{asI18n(p.name)}</span>
                  {p.last !== null ? <span className="shrink-0 text-px13 text-muted-foreground">{p.count > 1 ? m.metrics_screen__times_last({ count: p.count, time: clock(p.last) }) : clock(p.last)}</span> : null}
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
  )
}
