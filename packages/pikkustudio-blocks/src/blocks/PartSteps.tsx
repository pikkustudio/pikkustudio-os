import { m } from '@/i18n/messages'
import { useEffect, useState } from 'react'
import { Check, LoaderCircle, TriangleAlert } from 'lucide-react'
import { steps } from '../mocks/versions'

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
const short = () => [m.part_steps__fetched(), m.part_steps__built(), m.part_steps__tested(), m.part_steps__checked(), m.part_steps__live()]
const doing = () => [m.part_steps__fetching(), m.part_steps__building(), m.part_steps__testing(), m.part_steps__checking(), m.part_steps__going_live()]

/** Five steps in one row. Still when finished; only the current step of a publishing version spins and counts. */
export function PartSteps({ phase, state, failedAt }: { phase: number; state: 'working' | 'done' | 'stopped' | 'failed'; failedAt?: number }) {
  const [t, setT] = useState(134)
  useEffect(() => {
    if (state !== 'working') return
    const i = setInterval(() => setT((x) => x + 1), 1000)
    return () => clearInterval(i)
  }, [state])
  const doneCount = state === 'done' ? 5 : state === 'stopped' ? 4 : state === 'failed' ? (failedAt ?? 0) : phase
  return (
    <section aria-label={m.part_steps__how_far_it_got()} className="flex flex-col gap-3 rounded-card border border-border bg-card px-5 py-4 shadow-card">
      <ol className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, minmax(0, 1fr))" }}>
        {steps.map(([, secs], i) => {
          const done = i < doneCount
          const now = state === 'working' && i === phase
          const bad = state === 'failed' && i === failedAt
          return (
            <li key={i} className="flex flex-col gap-1">
              <span className="flex items-center gap-2 text-[14px] font-bold">
                <span className={`grid size-6 place-items-center rounded-full ${done ? 'bg-success text-white' : now ? 'text-info' : bad ? 'bg-destructive text-white' : 'border-[1.5px] border-input'}`}>
                  {done ? <Check className="size-4" aria-hidden="true" /> : now ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : bad ? <TriangleAlert className="size-3.5" aria-hidden="true" /> : null}
                </span>
                {now ? doing()[i] : state === 'stopped' && i === 4 ? m.part_steps__not_yet_live() : short()[i]}
              </span>
              <small className="pl-8 text-[13px] text-muted-foreground">{done ? m.part_steps__done() : now ? m.part_steps__working_on_it_now() : bad ? m.part_steps__stopped_here() : state === 'stopped' && i === 4 ? m.part_steps__waits_for_you() : `About ${secs} seconds`}</small>
            </li>
          )
        })}
      </ol>
      {state === 'working' && (
        <p className="text-[14px] text-ink-2">
          {m.part_steps__progress({ step: phase + 1, total: doing().length, what: doing()[phase].toLowerCase(), time: clock(t) })}
        </p>
      )}
    </section>
  )
}
