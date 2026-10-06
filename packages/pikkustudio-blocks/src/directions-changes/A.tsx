import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { Button } from '../ui/button'
import { CHANGES, LABEL, byState, type State } from './data'
import { Actions, Asks, Pill, Thread, WhatChanges } from './parts'

const ORDER: State[] = ['needs', 'working', 'waiting', 'aside', 'done']

export function InboxMain() {
  const [id, setId] = useState('c1')
  const c = CHANGES.find((x) => x.id === id)!
  return (
    <div className="grid min-w-0 flex-1 grid-cols-[19rem_1fr] gap-6">
      <nav aria-label="All changes" className="flex flex-col gap-5">
        {ORDER.map((s) =>
          byState(s).length ? (
            <section key={s} className="flex flex-col gap-1.5">
              <h2 className="px-2 text-[13px] font-bold tracking-[0.04em] text-muted-foreground uppercase">
                {LABEL[s]} · {byState(s).length}
              </h2>
              {byState(s).map((x) => (
                <button key={x.id} type="button" aria-current={x.id === id} onClick={() => setId(x.id)} className={`flex flex-col gap-1 rounded-2xl border-[1.5px] px-4 py-3 text-left transition-colors ${x.id === id ? 'border-primary bg-accent' : 'border-transparent hover:bg-secondary'} ${s === 'needs' && x.id !== id ? 'border-warning bg-card' : ''}`}>
                  <b className="text-[16px] leading-[1.3]">{x.title}</b>
                  <span className="text-[13px] text-ink-2">
                    {x.from} · {x.when}
                  </span>
                </button>
              ))}
            </section>
          ) : null,
        )}
      </nav>
      <article className="flex min-w-0 flex-col gap-5 rounded-[22px] border border-border bg-card p-7">
        <header className="flex flex-col gap-2.5">
          <Pill s={c.state} />
          <h2 className="text-[28px] leading-[1.15] font-bold text-balance">{c.title}</h2>
          <p className="text-[14px] text-ink-2">
            Asked by {c.from} · {c.when}
          </p>
          {c.now ? <p className="text-[16px] text-info-foreground">Right now: {c.now}</p> : null}
        </header>
        <Asks c={c} />
        <WhatChanges c={c} />
        <Actions c={c} />
        <Thread c={c} />
      </article>
    </div>
  )
}

export function InboxDock() {
  const need = byState('needs')
  const c = need[0]
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-secondary px-5 py-4">
      <div className="flex items-center gap-2 text-[14px]">
        <b className="flex-1 text-[15px]">Changes</b>
        <span className="rounded-full bg-warning px-2.5 py-0.5 font-bold text-on-warning">{need.length} need you</span>
        <span className="rounded-full bg-info-soft px-2.5 py-0.5 font-bold text-info-foreground">{byState('working').length} on it</span>
      </div>
      <div className="flex flex-col gap-2.5 rounded-2xl border-[1.5px] border-warning bg-card p-4">
        <b className="text-[16px] leading-[1.3]">{c.title}</b>
        <p className="text-[14px] text-ink-2">{c.asks}</p>
        <div className="flex gap-2">
          <Button variant="default" size="compact">
            Approve
          </Button>
          <Button variant="bordered" size="compact">
            Answer
          </Button>
        </div>
      </div>
      <button type="button" className="flex items-center gap-1 self-start text-[14px] font-bold text-accent-foreground hover:underline">
        Open all changes <ChevronRight className="size-4" />
      </button>
    </div>
  )
}
