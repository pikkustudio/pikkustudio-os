import { sep } from '@pikku/react'
import { ArrowRight, Check, Cloud, Laptop, LoaderCircle } from 'lucide-react'
import { m } from '@/i18n/messages'
import { Button } from '../ui/button'
import { wordsFor } from './ProjectWays'
import type { Plan, ProjectHome, Way } from '../lib/projectHome'

const icons = { cloud: Cloud, local: Laptop } as const

/** The go-live steps, drawn inside the hero in the same style as the project-creation progress list. */
export function GoLiveSteps({ plan, home, onAct, busy }: { plan: Plan; home: ProjectHome; onAct: (way: Way) => void; busy?: Way | null }) {
  const running = home.workspaces.some((w) => w.mine && w.state === 'working')
  const steps = [
    { label: running ? m.golive__step1_done() : m.golive__step1(), state: running ? 'done' : 'now' },
    { label: m.golive__step2(), state: running ? 'now' : 'wait' },
    { label: m.golive__step3(), state: 'wait' },
  ] as const
  return (
    <div>
      <ul className="flex list-none flex-col gap-3.5 text-[19px] font-semibold" aria-label={m.golive__aria()}>
        {steps.map((s) => (
          <li key={s.label} className={`flex items-center gap-3.5 ${s.state === 'wait' ? 'opacity-60' : ''}`} aria-current={s.state === 'now' ? 'step' : undefined}>
            {s.state === 'done' ? (
              <span className="grid size-7.5 shrink-0 place-items-center rounded-full bg-hero-ink text-hero">
                <Check className="size-4" strokeWidth={3} />
              </span>
            ) : s.state === 'now' ? (
              <span className="grid size-7.5 shrink-0 place-items-center rounded-full border-[2.5px] border-hero-ink">
                <span className="size-2.5 rounded-full bg-hero-ink" />
              </span>
            ) : (
              <span className="size-7.5 shrink-0 rounded-full border-2 border-dashed border-hero-ink" />
            )}
            {s.label}
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap items-start gap-x-6 gap-y-4">
        {running ? (
          <Button variant="hero" size="pageLg" type="button" onClick={() => onAct(plan.way)}>
            {m.golive__step2_action()}
            <ArrowRight className="rtl:-scale-x-100 size-5.5" />
          </Button>
        ) : (
          (['cloud', 'local'] as const).map((way) => {
            const w = wordsFor(way, plan)
            const Icon = icons[way]
            const off = (!home.online && (way === 'cloud' || !plan.mineLocal)) || !!busy
            const working = busy === way
            return (
              <div key={way} className="flex max-w-72 flex-col gap-2">
                <Button variant={way === 'cloud' ? 'hero' : 'heroGhost'} size="page" type="button" disabled={off} aria-busy={working} onClick={() => onAct(way)}>
                  {working ? <LoaderCircle className="size-4.5 animate-spin" /> : <Icon className="size-4.5" />}
                  {working ? w.working : w.action}
                </Button>
                <span className="text-px15 text-hero-ink-2 text-pretty">{w.why}{w.note ? <>{sep(' ')}{w.note}</> : null}</span>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
