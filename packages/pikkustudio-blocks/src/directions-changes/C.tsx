import { useState } from 'react'
import { X } from 'lucide-react'
import { Button } from '../ui/button'
import { CHANGES, SETS, inSet, type Set } from './data'
import { Actions, Asks, Pill, Thread, WhatChanges } from './parts'

const COLS: { id: string; title: string; match: (s: Set) => boolean }[] = [
  { id: 'needs', title: 'Needs you', match: (s) => s.state === 'needs' },
  { id: 'working', title: 'Pikku is building', match: (s) => s.state === 'working' },
  { id: 'waiting', title: 'Waiting its turn', match: (s) => s.state === 'waiting' },
  { id: 'done', title: 'Kept', match: (s) => s.state === 'done' },
]

export function BoardMain() {
  const [sel, setSel] = useState<string | null>('s1')
  const [pick, setPick] = useState('c1')
  const set = SETS.find((s) => s.id === sel)
  const c = CHANGES.find((x) => x.id === pick)
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-5">
      <div className="grid min-w-0 grid-cols-4 gap-3">
        {COLS.map((col) => (
          <section key={col.id} className="flex min-w-0 flex-col gap-3 self-start rounded-[22px] bg-secondary p-3">
            <h2 className="px-2 pt-1 text-[15px] font-bold">{col.title}</h2>
            {SETS.filter(col.match).map((s) => (
              <button key={s.id} type="button" aria-pressed={sel === s.id} onClick={() => (setSel(s.id), setPick(inSet(s.id)[0].id))} className={`flex flex-col gap-3 rounded-[18px] border-[1.5px] bg-card p-4 text-left ${sel === s.id ? 'border-primary' : s.state === 'needs' ? 'border-warning' : 'border-transparent'}`}>
                <b className="text-[17px] leading-[1.25]">{s.title}</b>
                <ul className="flex flex-col gap-1.5 text-[14px] text-ink-2">
                  {inSet(s.id).map((x) => (
                    <li key={x.id} className="flex gap-2">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${x.state === 'done' ? 'bg-success' : x.state === 'needs' ? 'bg-warning' : x.state === 'working' ? 'bg-info' : 'bg-input'}`} />
                      {x.title}
                    </li>
                  ))}
                </ul>
                <span className="text-[13px] text-muted-foreground">{s.note}</span>
              </button>
            ))}
          </section>
        ))}
      </div>
      {set && c ? (
        <aside aria-label={set.title} className="flex flex-col gap-4 rounded-[22px] border border-border bg-card p-7">
          <div className="flex items-start gap-3">
            <h2 className="flex-1 text-[24px] leading-[1.2] font-bold">{set.title}</h2>
            <button type="button" aria-label="Close" onClick={() => setSel(null)} className="grid size-9 place-items-center rounded-full hover:bg-secondary">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {inSet(set.id).map((x) => (
              <Button key={x.id} variant="filter" size="compact" aria-pressed={pick === x.id} onClick={() => setPick(x.id)}>
                {x.title.length > 24 ? `${x.title.slice(0, 22)}…` : x.title}
              </Button>
            ))}
          </div>
          <Pill s={c.state} />
          <b className="text-[18px] leading-[1.3]">{c.title}</b>
          <Asks c={c} />
          <WhatChanges c={c} />
          <Actions c={c} size="compact" />
          <Thread c={c} compact />
        </aside>
      ) : null}
    </div>
  )
}

export function BoardDock() {
  return (
    <div className="flex flex-col gap-3 border-b border-border bg-secondary px-5 py-4">
      <b className="text-[15px]">Changes</b>
      <div className="grid grid-cols-4 gap-2 text-center">
        {COLS.map((col) => (
          <div key={col.id} className={`flex flex-col rounded-xl px-1 py-2 ${col.id === 'needs' ? 'bg-warning text-on-warning' : 'bg-card'}`}>
            <b className="font-heading text-[22px] leading-none">{SETS.filter(col.match).reduce((n, s) => n + inSet(s.id).length, 0)}</b>
            <span className="text-[11px] leading-[1.2] font-semibold">{col.title.replace('Pikku is ', '')}</span>
          </div>
        ))}
      </div>
      <ul className="flex flex-col gap-2">
        {SETS.slice(0, 3).map((s) => {
          const all = inSet(s.id)
          const n = all.filter((x) => x.state === 'done').length
          return (
            <li key={s.id} className="flex flex-col gap-1.5 text-[14px]">
              <span className="font-semibold">{s.title}</span>
              <span className="h-1.5 overflow-hidden rounded-full bg-input">
                <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(8, (n / all.length) * 100)}%` }} />
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
