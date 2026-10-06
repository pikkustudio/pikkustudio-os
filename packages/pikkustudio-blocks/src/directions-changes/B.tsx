import { useState } from 'react'
import { ChevronDown, LayoutGrid, Rows3, X } from 'lucide-react'
import { Segmented } from '../blocks/Segmented'
import { CHANGES, FACTS, SETS, byState, type Change } from './data'
import { Actions, Asks, Pill, Thread, WhatChanges } from './parts'

const DAYS = [
  { day: 'Today', ids: ['c1', 'c2', 'c3', 'c4'] },
  { day: 'Yesterday', ids: ['c5', 'c6'] },
  { day: 'Earlier', ids: ['c7', 'c8'] },
]

function Facts({ c }: { c: Change }) {
  const f = FACTS[c.id]
  const rows: [string, string][] = [
    ['Where it shows up', f.pages.join(', ')],
    ['Checked', f.checked.join('. ')],
    ['Where it is now', f.where],
    ['Who decided', f.by],
    ['Time and cost', `${f.took}, ${f.cost}`],
    ['Part of', SETS.find((x) => x.id === c.set)?.title ?? ''],
  ]
  return (
    <dl className="grid grid-cols-[9.5rem_1fr] gap-x-4 gap-y-2.5 rounded-[18px] border border-border p-5 text-[15px]">
      {rows.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="font-bold text-ink-2">{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  )
}

function Detail({ c }: { c: Change }) {
  return (
    <div className="flex flex-col gap-4">
      <Asks c={c} />
      <WhatChanges c={c} />
      <Facts c={c} />
      <Actions c={c} size="compact" />
      <Thread c={c} compact />
    </div>
  )
}

function Card({ c, on, onPick }: { c: Change; on: boolean; onPick: () => void }) {
  return (
    <button type="button" aria-pressed={on} onClick={onPick} className={`flex flex-col gap-3 rounded-[20px] border-[1.5px] bg-card p-5 text-left ${on ? 'border-primary' : c.state === 'needs' ? 'border-warning' : 'border-border'}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        <Pill s={c.state} small />
        <span className="text-[13px] text-muted-foreground">{c.when}</span>
      </div>
      <b className="text-[17px] leading-[1.3]">{c.title}</b>
      {c.now ? <span className="text-[14px] text-info-foreground">{c.now}</span> : null}
      <span className="mt-auto text-[13px] text-ink-2">
        {c.from} · {FACTS[c.id].checked[0]}
      </span>
    </button>
  )
}

function Entry({ c, open, onToggle }: { c: Change; open: boolean; onToggle: () => void }) {
  return (
    <li className="relative flex gap-4 pb-6 pl-1">
      <span className="absolute top-3 bottom-0 left-3 w-0.5 bg-border" aria-hidden="true" />
      <span className={`relative z-1 mt-1 size-5 shrink-0 rounded-full border-4 border-background ${c.state === 'needs' ? 'bg-warning' : c.state === 'done' ? 'bg-success' : c.state === 'working' ? 'bg-info' : 'bg-input'}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-3 rounded-[20px] border border-border bg-card p-5">
        <button type="button" aria-expanded={open} onClick={onToggle} className="flex items-start gap-3 text-left">
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <Pill s={c.state} small />
              <span className="text-[13px] text-muted-foreground">
                {c.from} · {c.when}
              </span>
            </div>
            <b className="text-[18px] leading-[1.3]">{c.title}</b>
            {c.now ? <span className="text-[15px] text-info-foreground">{c.now}</span> : null}
            <div className="flex flex-wrap gap-1.5 pt-0.5 text-[13px] text-ink-2">
              <span className="rounded-full bg-secondary px-2.5 py-0.5">Part of: {SETS.find((x) => x.id === c.set)?.title}</span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5">{FACTS[c.id].pages.length === 1 ? FACTS[c.id].pages[0] : `${FACTS[c.id].pages.length} places`}</span>
              <span className="rounded-full bg-secondary px-2.5 py-0.5">{FACTS[c.id].checked[0]}</span>
            </div>
          </div>
          <ChevronDown className={`mt-1 size-5 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
        {open ? (
          <div className="border-t border-border pt-4">
            <Detail c={c} />
          </div>
        ) : null}
      </div>
    </li>
  )
}

export function TimelineMain() {
  const [view, setView] = useState('rows')
  const [open, setOpen] = useState<string | null>('c1')
  const picked = CHANGES.find((x) => x.id === open)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="flex">
        <Segmented
          label="How to show changes"
          value={view}
          onChange={setView}
          options={[
            ['rows', <span key="r" className="inline-flex items-center gap-1.5"><Rows3 className="size-4" />Timeline</span>],
            ['cards', <span key="c" className="inline-flex items-center gap-1.5"><LayoutGrid className="size-4" />Cards</span>],
          ]}
        />
      </div>
      {view === 'rows' ? (
        DAYS.map(({ day, ids }) => (
          <section key={day} className="flex flex-col gap-3">
            <h2 className="pl-1 text-[22px] font-bold">{day}</h2>
            <ol className="flex flex-col">
              {ids.map((id) => {
                const c = CHANGES.find((x) => x.id === id)!
                return <Entry key={id} c={c} open={open === id} onToggle={() => setOpen(open === id ? null : id)} />
              })}
            </ol>
          </section>
        ))
      ) : (
        <div className="flex items-start gap-5">
          <div className="flex min-w-0 flex-1 flex-col gap-6">
            {DAYS.map(({ day, ids }) => (
              <section key={day} className="flex flex-col gap-3">
                <h2 className="pl-1 text-[22px] font-bold">{day}</h2>
                <div className={`grid gap-3.5 ${picked ? 'grid-cols-1 @min-[1700px]/app:grid-cols-2' : 'grid-cols-2 @min-[1700px]/app:grid-cols-3'}`}>
                  {ids.map((id) => (
                    <Card key={id} c={CHANGES.find((x) => x.id === id)!} on={open === id} onPick={() => setOpen(open === id ? null : id)} />
                  ))}
                </div>
              </section>
            ))}
          </div>
          {picked ? (
            <aside aria-label={picked.title} className="sticky top-0 flex w-[30rem] shrink-0 flex-col gap-4 rounded-[22px] border border-border bg-card p-6">
              <div className="flex items-start gap-3">
                <div className="flex flex-1 flex-col gap-2">
                  <Pill s={picked.state} small />
                  <h2 className="text-[22px] leading-[1.2] font-bold">{picked.title}</h2>
                </div>
                <button type="button" aria-label="Close" onClick={() => setOpen(null)} className="grid size-9 place-items-center rounded-full hover:bg-secondary">
                  <X className="size-5" />
                </button>
              </div>
              <Detail c={picked} />
            </aside>
          ) : null}
        </div>
      )}
    </div>
  )
}

const STEPS = ['Understood', 'Changed on a copy', 'Tested', 'Ready for you']

export function TimelineDock() {
  const c = byState('working')[0]
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-secondary px-5 py-4">
      <div className="flex items-center gap-2">
        <span className="size-2.5 animate-pulse rounded-full bg-info" />
        <b className="flex-1 text-[15px]">Pikku is working on</b>
      </div>
      <div className="flex flex-col gap-3 rounded-2xl bg-card p-4">
        <b className="text-[16px] leading-[1.3]">{c.title}</b>
        <p className="text-[14px] text-info-foreground">{c.now}</p>
        <ol className="flex gap-1.5" aria-label="Progress">
          {STEPS.map((s, i) => (
            <li key={s} title={s} className={`h-1.5 flex-1 rounded-full ${i < 2 ? 'bg-primary' : 'bg-input'}`} />
          ))}
        </ol>
        <span className="text-[13px] text-muted-foreground">Step 2 of 4 · {STEPS[1]}</span>
      </div>
      <span className="text-[14px] text-ink-2">
        <b className="text-warning-foreground">{byState('needs').length} changes</b> are waiting for you.
      </span>
    </div>
  )
}
