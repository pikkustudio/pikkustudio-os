import { asI18n, sep } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useState } from 'react'
import { Section } from './Section'
import { seconds, speed } from '../screens/metrics-shared'

/** What took longest on average, slowest first, five at a time. */
export function MetricsFunctions({ scope, slow }: { scope: 'app' | 'studio'; slow: Array<{ name: string; count: number; average: number }> }) {
  const [showAll, setShowAll] = useState(false)
  const top = slow[0]?.average || 1
  const shown = showAll ? slow : slow.slice(0, 5)
  return (
    <Section title={m.metrics_screen__longest_title()} sub={m.metrics_screen__longest_sub()}>
      <div className="rounded-empty border border-border bg-card p-5" data-testid="metrics-slowest">
        {slow.length === 0 ? (
          <p className="text-px15 text-muted-foreground">{scope === 'studio' ? m.metrics_screen__none_studio() : m.metrics_screen__none_app()}</p>
        ) : (
          <ul className="flex flex-col gap-4">
            {shown.map((s) => {
              const fast = speed(s.average)
              return (
                <li key={s.name}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate text-px15 font-semibold">{asI18n(s.name)}</span>
                    <span className="shrink-0 text-sm tabular-nums">
                      <span className={`font-semibold ${fast.text}`}>{fast.word}</span>
                      <span className="text-muted-foreground">{sep(' · ')}{seconds(s.average)}</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-secondary" data-hue="teal">
                    <div className={`h-full rounded-full ${fast.bar}`} style={{ width: `${Math.max(3, (s.average / top) * 100)}%` }} />
                  </div>
                  <div className="mt-1 text-px13 text-muted-foreground">{m.metrics_screen__happened({ count: s.count })}</div>
                </li>
              )
            })}
          </ul>
        )}
        {slow.length > 5 ? (
          <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-4 text-px15 font-semibold text-hero hover:underline" data-testid="metrics-slowest-more">
            {showAll ? m.metrics_screen__show_fewer() : m.metrics_screen__show_more({ count: slow.length - 5 })}
          </button>
        ) : null}
      </div>
    </Section>
  )
}
