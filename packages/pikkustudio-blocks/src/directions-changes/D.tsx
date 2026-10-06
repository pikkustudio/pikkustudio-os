import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { Button } from '../ui/button'
import { byState } from './data'
import { Asks, Pill, Thread, WhatChanges } from './parts'

const BEFORE = { label: 'Before', text: 'Reserve a seat', note: 'One seat per booking' }
const AFTER = { label: 'After', text: 'Reserve seats', note: 'How many? 1  2' }

function Shot({ s, after }: { s: typeof BEFORE; after?: boolean }) {
  return (
    <figure className="flex flex-1 flex-col gap-2">
      <figcaption className={`text-[13px] font-bold tracking-[0.04em] uppercase ${after ? 'text-success-foreground' : 'text-muted-foreground'}`}>{s.label}</figcaption>
      <div className={`flex flex-col items-center gap-3 rounded-2xl border-[1.5px] bg-card p-6 ${after ? 'border-success' : 'border-border'}`}>
        <span className="text-[14px] text-ink-2">Saturday sourdough, 10:00</span>
        <span className="text-[14px] font-semibold">{s.note}</span>
        <span className="rounded-full bg-primary px-5 py-2.5 text-[15px] font-bold text-primary-foreground">{s.text}</span>
      </div>
    </figure>
  )
}

export function FocusMain() {
  const q = byState('needs')
  const [i, setI] = useState(0)
  const [done, setDone] = useState<string[]>([])
  const left = q.filter((c) => !done.includes(c.id))
  const c = left[0]
  if (!c)
    return (
      <div className="flex flex-1 flex-col items-start gap-3 rounded-[22px] border-2 border-dashed border-input p-9">
        <b className="font-heading text-[26px]">You are all caught up.</b>
        <p className="max-w-ch56 text-[17px] text-ink-2">Nothing needs you. Pikku is working on {byState('working').length} changes and will tell you the moment one is ready.</p>
        <Button variant="bordered" size="page" onClick={() => (setDone([]), setI(0))}>
          Start over
        </Button>
      </div>
    )
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <div className="flex items-center gap-3 text-[15px] text-ink-2">
        <b className="text-foreground">
          {done.length + 1} of {q.length}
        </b>
        waiting for you
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-input">
          <span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${(done.length / q.length) * 100}%` }} />
        </span>
      </div>
      <article className="flex flex-col gap-6 rounded-[22px] border border-border bg-card p-8">
        <header className="flex flex-col gap-2.5">
          <Pill s={c.state} />
          <h2 className="text-[32px] leading-[1.12] font-bold text-balance">{c.title}</h2>
          <p className="text-[15px] text-ink-2">
            Asked by {c.from} · {c.when}
          </p>
        </header>
        <div className="flex items-center gap-4">
          <Shot s={BEFORE} />
          <ArrowRight className="size-6 shrink-0 text-muted-foreground" />
          <Shot s={AFTER} after />
        </div>
        <Asks c={c} />
        <WhatChanges c={c} />
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="hero" size="pageLg" onClick={() => setDone((d) => [...d, c.id])}>
            Approve and keep it
          </Button>
          <Button variant="bordered" size="page" onClick={() => setDone((d) => [...d, c.id])}>
            Not now
          </Button>
          <span className="text-[14px] text-muted-foreground">Next one comes up on its own.</span>
        </div>
        <Thread c={c} />
      </article>
    </div>
  )
}

export function FocusDock() {
  const q = byState('needs')
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-secondary px-5 py-4">
      <div className="flex items-center gap-2">
        <b className="flex-1 text-[15px]">Next for you</b>
        <span className="rounded-full bg-warning px-2.5 py-0.5 text-[13px] font-bold text-on-warning">{q.length}</span>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
        <div className="flex gap-2 text-[13px]">
          <span className="flex-1 rounded-lg bg-secondary px-2 py-1.5 text-center text-ink-2">{BEFORE.text}</span>
          <ArrowRight className="size-4 self-center text-muted-foreground" />
          <span className="flex-1 rounded-lg bg-success-soft px-2 py-1.5 text-center font-semibold text-success-foreground">{AFTER.text}</span>
        </div>
        <b className="text-[16px] leading-[1.3]">{q[0].title}</b>
        <Button variant="default" size="compact">
          Review it
        </Button>
      </div>
    </div>
  )
}
