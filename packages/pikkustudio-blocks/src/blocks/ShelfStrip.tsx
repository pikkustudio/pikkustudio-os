import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { steps } from '../mocks/versions'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/** Five labelled steps in one row. The only moving thing in the feature: the current ring and the clock. */
export function ShelfStrip({ phase, start = 134, onHero }: { phase: number; start?: number; onHero?: boolean }) {
  const [t, setT] = useState(start)
  useEffect(() => {
    const i = setInterval(() => setT((x) => x + 1), 1000)
    return () => clearInterval(i)
  }, [])
  const ink = onHero ? 'text-hero-ink' : 'text-foreground'
  const sub = onHero ? 'text-hero-ink-2' : 'text-ink-2'
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-2">
        {steps.map(([name, secs], i) => (
          <li key={name} className="flex flex-col gap-1.5">
            {i < phase ? (
              <span className={`grid size-7 place-items-center rounded-full ${onHero ? 'bg-hero-btn text-hero-btn-ink' : 'bg-success text-white'}`}>
                <Check className="size-4" strokeWidth={3} aria-label={m.shelf_strip__done()} />
              </span>
            ) : i === phase ? (
              <span className={`size-7 animate-spin rounded-full border-[3px] border-e-transparent ${onHero ? 'border-hero-ink' : 'border-info'}`} role="status" aria-label={m.shelf_strip__working_on_it_now()} />
            ) : (
              <span className={`size-7 rounded-full border-[2.5px] ${onHero ? 'border-hero-ink-2 opacity-60' : 'border-input'}`} aria-label={m.shelf_strip__waiting()} />
            )}
            <b className={`text-[14px] leading-[1.3] ${ink}`}>{asI18n(name)}</b>
            <small className={`text-[13px] ${sub}`}>{i < phase ? m.shelf_strip__done() : i === phase ? m.shelf_strip__working_on_it_now() : m.common__about_seconds({ secs })}</small>
          </li>
        ))}
      </ol>
      <p className={`text-[14px] ${sub}`}>
        {m.shelf_strip__progress({ step: phase + 1, total: steps.length, what: steps[phase][0].toLowerCase(), time: clock(t) })}
      </p>
    </div>
  )
}
