import { m } from '@/i18n/messages'
import { Check, Clock, LoaderCircle, TriangleAlert, Undo2, X } from 'lucide-react'
import type { Outcome, Version } from '../mocks/versions'

/** The week the sample lives in: Monday 28 Sep to Sunday 4 Oct. */
export const weekDays = () => [
  { name: m.week_strip__mon_short(), long: m.week_strip__mon_long(), date: 28, label: m.week_strip__day_label({ weekday: m.week_strip__mon_long(), date: 28, month: m.week_strip__sep() }) },
  { name: m.week_strip__tue_short(), long: m.week_strip__tue_long(), date: 29, label: m.week_strip__day_label({ weekday: m.week_strip__tue_long(), date: 29, month: m.week_strip__sep() }) },
  { name: m.week_strip__wed_short(), long: m.week_strip__wed_long(), date: 30, label: m.week_strip__day_label({ weekday: m.week_strip__wed_long(), date: 30, month: m.week_strip__sep() }) },
  { name: m.week_strip__thu_short(), long: m.week_strip__thu_long(), date: 1, label: m.week_strip__day_label({ weekday: m.week_strip__thu_long(), date: 1, month: m.week_strip__oct() }) },
  { name: m.week_strip__fri_short(), long: m.week_strip__fri_long(), date: 2, label: m.week_strip__day_label({ weekday: m.week_strip__fri_long(), date: 2, month: m.week_strip__oct() }) },
  { name: m.week_strip__sat_short(), long: m.week_strip__sat_long(), date: 3, label: m.week_strip__day_label({ weekday: m.week_strip__sat_long(), date: 3, month: m.week_strip__oct() }) },
  { name: m.week_strip__sun_short(), long: m.week_strip__sun_long(), date: 4, label: m.week_strip__day_label({ weekday: m.week_strip__sun_long(), date: 4, month: m.week_strip__oct() }) },
]

/** Which weekday (0 = Monday) a sample version belongs to, derived from its `day` text. */
export const dayOf = (v: Pick<Version, 'day'>) => (v.day === 'Today' ? 6 : v.day === 'Yesterday' ? 5 : v.day.startsWith('Friday') ? 4 : 0)

const glyph: Record<Outcome, { Icon: typeof Check; cls: string; word: () => string }> = {
  live: { Icon: Check, cls: 'text-success', word: m.week_strip__word_live },
  'was-live': { Icon: Clock, cls: 'text-muted-foreground', word: m.week_strip__word_was_live },
  failed: { Icon: TriangleAlert, cls: 'text-destructive', word: m.week_strip__word_failed },
  'rolled-back': { Icon: Undo2, cls: 'text-muted-foreground', word: m.week_strip__word_rolled_back },
  cancelled: { Icon: X, cls: 'text-muted-foreground', word: m.week_strip__word_cancelled },
  working: { Icon: LoaderCircle, cls: 'text-info', word: m.week_strip__word_working },
  waiting: { Icon: Clock, cls: 'text-warning-ink', word: m.week_strip__word_waiting },
}
export const outcomeGlyph = glyph

const order: Outcome[] = ['working', 'waiting', 'live', 'failed', 'rolled-back', 'was-live', 'cancelled']

/** Sentence for a day: "1 live, 1 publishing". Never a bare number. */
export const daySentence = (vs: Version[]) =>
  vs.length === 0
    ? m.week_strip__quiet_day()
    : order
        .map((o) => [o, vs.filter((v) => v.outcome === o).length] as const)
        .filter(([, n]) => n)
        .map(([o, n]) => `${n} ${glyph[o].word()}`)
        .join(', ')

/** Seven small white day cards. Dots and a sentence only, no titles: they are about 155px wide. */
export function WeekStrip({ byDay, today, picked, onPick }: { byDay: Version[][]; today: number | null; picked: number | null; onPick: (i: number) => void }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }} role="group" aria-label={m.week_strip__days_of_this_week()}>
      {weekDays().map((d, i) => {
        const vs = byDay[i]
        const here = today === i
        return (
          <button
            key={d.name}
            type="button"
            disabled={vs.length === 0}
            aria-pressed={picked === i}
            aria-label={`${d.label}. ${daySentence(vs)}`}
            onClick={() => onPick(i)}
            className={`flex min-h-31 flex-col items-start gap-1 rounded-[14px] border bg-card p-3 text-left shadow-card transition-colors enabled:hover:border-input focus-visible:outline-3 focus-visible:outline-ring ${picked === i ? 'border-primary ring-[3px] ring-accent' : here ? 'border-primary/50 ring-[3px] ring-accent' : 'border-border'} ${vs.length === 0 ? 'text-muted-foreground' : ''}`}
          >
            <span className="text-[14px] font-bold">{here ? m.week_strip__today() : d.name}</span>
            <span className="text-[20px] leading-none font-bold">{d.date}</span>
            <span className="flex flex-wrap gap-1 pt-1" aria-hidden="true">
              {vs.map((v) => {
                const g = glyph[v.outcome]
                return <g.Icon key={v.id} className={`size-4 ${g.cls} ${v.outcome === 'working' ? 'animate-spin' : ''}`} />
              })}
            </span>
            <span className="mt-auto text-[13px] leading-snug text-ink-2">{daySentence(vs)}</span>
          </button>
        )
      })}
    </div>
  )
}

const mins = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

/** A hairline 06:00 to 22:00 with a dot where each version finished. Only a locator; the row cards carry the detail. */
export function WeekDayRuler({ items, now }: { items: Version[]; now?: string }) {
  const pos = (t: string) => Math.min(100, Math.max(0, ((mins(t) - 360) / 960) * 100))
  const dot: Record<Outcome, string> = { live: 'bg-success', 'was-live': 'bg-muted-foreground', failed: 'bg-destructive', 'rolled-back': 'bg-muted-foreground', cancelled: 'bg-muted-foreground', working: 'bg-info', waiting: 'bg-warning' }
  return (
    <div className="px-1 pb-1" aria-hidden="true">
      <div className="relative h-4 border-b border-border">
        {items.map((v) => (
          <i key={v.id} style={{ left: `${pos(v.time)}%`, transform: 'translateX(-50%)' }} className={`absolute bottom-[-5px] size-2.5 rounded-full ${dot[v.outcome]}`} />
        ))}
        {now && <i style={{ left: `${pos(now)}%`, transform: 'translateX(-50%)' }} className="absolute bottom-[-1px] h-3 w-0.5 rounded-full bg-primary" />}
      </div>
      <div className="relative mt-1.5 h-4 text-[13px] text-muted-foreground">
        {['06', '10', '14', '18', '22'].map((h, i) => (
          <span key={h} style={{ left: `${i * 25}%`, transform: `translateX(-${i * 25}%)` }} className="absolute">
            {h}:00
          </span>
        ))}
      </div>
    </div>
  )
}
