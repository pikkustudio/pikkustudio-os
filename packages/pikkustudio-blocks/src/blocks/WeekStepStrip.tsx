import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useState } from 'react'
import { Check, LoaderCircle } from 'lucide-react'
import { steps } from '../mocks/versions'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Five labelled pips on a hero. The one thing in the feature that moves: the current pip spins and the clock ticks. */
export function WeekStepStrip({ phase, start = 134 }: { phase: number; start?: number }) {
  const [t, setT] = useState(start)
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 1000)
    return () => clearInterval(i)
  }, [])
  return (
    <div className="flex flex-col gap-3 pt-1">
      <ol className="grid gap-2" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {steps.map(([name, secs], i) => (
          <li key={name} className="flex flex-col gap-1">
            <span className={`grid size-7 place-items-center rounded-full border-2 ${i < phase ? 'border-hero-ink bg-hero-ink text-hero' : i === phase ? 'border-hero-ink' : 'border-hero-ink/50'}`}>
              {i < phase ? <Check className="size-4" aria-hidden="true" /> : i === phase ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
            </span>
            <span className="text-[14px] leading-tight font-bold">{asI18n(name)}</span>
            <span className="text-[13px] text-hero-ink-2">{i < phase ? m.week_step_strip__done() : i === phase ? m.week_step_strip__working_on_it() : m.common__about_seconds({ secs })}</span>
          </li>
        ))}
      </ol>
      <p className="text-[14px] text-hero-ink-2">
        {m.week_step_strip__progress({ step: phase + 1, total: steps.length, what: steps[phase][0].toLowerCase(), time: clock(t) })}
      </p>
    </div>
  )
}
