import { asI18n } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

export const stepNames = () => [m.shelf_strip__step_fetch(), m.shelf_strip__step_build(), m.shelf_strip__step_test(), m.shelf_strip__step_check(), m.shelf_strip__step_live()]

export function ShelfStrip({ phase, since, onHero }: { phase: number; since: number; onHero?: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(i)
  }, [])
  const names = stepNames()
  const step = Math.min(Math.max(phase, 0), names.length - 1)
  const ink = onHero ? 'text-hero-ink' : 'text-foreground'
  const sub = onHero ? 'text-hero-ink-2' : 'text-ink-2'
  return (
    <div className="flex flex-col gap-3">
      <ol className="grid grid-cols-[repeat(5,minmax(0,1fr))] gap-2">
        {names.map((name, i) => (
          <li key={i} className="flex flex-col gap-1.5">
            {i < step ? (
              <span className={`grid size-7 place-items-center rounded-full ${onHero ? 'bg-hero-btn text-hero-btn-ink' : 'bg-success text-white'}`}>
                <Check className="size-4" strokeWidth={3} aria-label={m.shelf_strip__done()} />
              </span>
            ) : i === step ? (
              <span className={`size-7 animate-spin rounded-full border-[3px] border-e-transparent ${onHero ? 'border-hero-ink' : 'border-info'}`} role="status" aria-label={m.shelf_strip__working_on_it_now()} />
            ) : (
              <span className={`size-7 rounded-full border-[2.5px] ${onHero ? 'border-hero-ink-2 opacity-60' : 'border-input'}`} aria-label={m.shelf_strip__waiting()} />
            )}
            <b className={`text-[14px] leading-[1.3] ${ink}`}>{name}</b>
            <small className={`text-[13px] ${sub}`}>{i < step ? m.shelf_strip__done() : i === step ? m.shelf_strip__working_on_it_now() : m.shelf_strip__waiting()}</small>
          </li>
        ))}
      </ol>
      <p className={`text-[14px] ${sub}`}>
        {m.shelf_strip__progress({ step: step + 1, total: names.length, what: asI18n(names[step].toLowerCase()), time: asI18n(clock(Math.max(0, Math.round((now - since) / 1000)))) })}
      </p>
    </div>
  )
}
