import { useEffect, useState } from 'react'
import { ArrowLeft, Check, CircleAlert, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Segmented } from './Segmented'
import { ErrorState } from './ErrorState'
import { useProjectAction } from '../lib/projectRpc'
import { FOUND, GOAL_WORD, KIND, ago, outcome, problemsOf, reached, type Run, type VirtualUser } from '../lib/virtualUsers'

type Tab = 'visits' | 'about' | 'own'

const DAY = 86_400_000
const GAPS: [string, string, number, number][] = [
  ['day', 'Every day', DAY * 0.5, DAY * 1.5],
  ['few', 'Every few days', DAY * 2, DAY * 4],
  ['week', 'Every week', DAY * 5, DAY * 9],
]

const gapOf = (min: number) => (min <= DAY ? 'day' : min <= DAY * 3 ? 'few' : 'week')

function Report({ u, run, onBack }: { u: VirtualUser; run: Run; onBack: () => void }) {
  const problems = problemsOf(run)
  const mins = run.finishedAt ? Math.max(1, Math.round((new Date(run.finishedAt).getTime() - new Date(run.createdAt).getTime()) / 60_000)) : null
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-5 py-5">
      <Button variant="bordered" size="compact" className="self-start" onClick={onBack}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        All visits
      </Button>
      <div>
        <h3 className="font-heading text-[22px] leading-[1.2] font-bold">{outcome(u.name, run)}</h3>
        <p className="mt-1 text-[15px] text-ink-2">
          {ago(run.createdAt)}
          {mins ? ` · ${mins} ${mins === 1 ? 'minute' : 'minutes'}` : ''} · on your preview site
        </p>
        <p className="mt-2 text-[16px] text-ink-2">{problems.length === 0 ? 'They ran into no problems.' : problems.length === 1 ? 'They ran into 1 problem on the way.' : `They ran into ${problems.length} problems on the way.`}</p>
      </div>
      {run.status === 'failed' && run.error ? (
        <div className="rounded-card border border-border bg-secondary p-4 text-[15px] text-ink-2">
          <b className="block text-foreground">The visit stopped early</b>
          {run.error}
        </div>
      ) : null}
      {problems.length > 0 ? (
        <section>
          <h4 className="mb-2 font-heading text-[18px] font-bold">What they found</h4>
          <ul className="flex flex-col gap-2.5">
            {problems.map((p, i) => (
              <li key={i} className="flex gap-3 rounded-card border border-destructive/40 bg-card p-3.5">
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
                <span className="text-[16px]">
                  <b className="block">{FOUND(u.name, p.kind, p.detail)}</b>
                  {p.goal ? <span className="block text-[14px] text-ink-2">While trying to: {p.goal}</span> : null}
                  <span className="block text-[14px] text-ink-2">{p.count === 1 ? 'Once' : `${p.count} times`}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {run.intents.length > 0 ? (
        <section>
          <h4 className="mb-2 font-heading text-[18px] font-bold">What they tried to do</h4>
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            {run.intents.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[16px]">
                <span>{i.title}</span>
                <span className={`flex shrink-0 items-center gap-1.5 text-[14px] font-semibold ${i.status === 'completed' ? 'text-accent-foreground' : 'text-ink-2'}`}>
                  {i.status === 'completed' ? <Check className="size-4" aria-hidden="true" /> : null}
                  {GOAL_WORD[i.status] ?? i.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-[14px] text-ink-2">A visit with no problems is good news for today, not a guarantee. Each visit goes a little differently.</p>
    </div>
  )
}

export function VirtualUserDrawer({ u, projectKey, start, onClose }: { u: VirtualUser; projectKey: string; start: Tab; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(start)
  const [open, setOpen] = useState<string | null>(null)
  const save = useProjectAction<{ persona: string; enabled?: boolean; minIntervalMs?: number; maxIntervalMs?: number }>(projectKey, 'console:setVirtualUserSchedule', ['console:getVirtualUserSchedules'])
  const [kind, kindText] = KIND[u.disposition]
  const run = u.visits.find((v) => v.runId === open)
  const on = !!u.schedule?.enabled
  const gap = gapOf(u.schedule?.minIntervalMs ?? DAY * 2)

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const tabBtn = (id: Tab, label: string) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => (setTab(id), setOpen(null))} className={`border-b-[3px] px-4 py-3 text-[16px] font-semibold ${tab === id ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}>
      {label}
    </button>
  )

  return (
    <aside aria-label={`${u.name}, a virtual user`} className="fixed inset-y-0 right-0 z-50 flex w-102 max-w-full flex-col border-l border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.45)] @min-[1700px]/app:w-120">
      <header data-hue="petrol" className="flex items-center gap-3 bg-hero px-5 pt-4 pb-4 text-hero-ink">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white font-heading text-[24px] font-bold text-hero-btn-ink" aria-hidden="true">
          {u.name.charAt(0)}
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.012em]">{u.name}</h2>
          <small className="block text-[14px] text-hero-ink-2">{[u.job, kind].filter(Boolean).join(' · ')}</small>
        </span>
        <button type="button" aria-label="Close" onClick={onClose} className="grid size-11 place-items-center rounded-full text-hero-ink transition-colors hover:bg-white/15">
          <X className="size-5.5" />
        </button>
      </header>

      <div className="flex gap-1 border-b border-border px-3" role="tablist">
        {tabBtn('visits', `Visits (${u.visits.length})`)}
        {tabBtn('about', 'About')}
        {tabBtn('own', 'On their own')}
      </div>

      {tab === 'visits' ? (
        run ? (
          <Report u={u} run={run} onBack={() => setOpen(null)} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-5">
            {u.visiting ? (
              <div role="status" className="rounded-card bg-accent p-4 text-[15px] text-accent-foreground">
                <b className="block">{u.name} is on a visit now</b>
                This usually takes a few minutes. You can leave this page. The report will wait here.
              </div>
            ) : null}
            {u.visits.length === 0 && !u.visiting ? <p className="text-[16px] text-ink-2">{u.name} has not visited yet. Send them on a visit and the report will show up here.</p> : null}
            {u.visits.map((v) => {
              const n = problemsOf(v).length
              return (
                <button key={v.runId} type="button" onClick={() => setOpen(v.runId)} className="flex flex-col gap-0.5 rounded-card border border-border bg-card px-4 py-3 text-left transition-colors hover:bg-secondary">
                  <b className="text-[16px]">{ago(v.createdAt)}</b>
                  <span className="text-[15px] text-ink-2">
                    {v.status === 'failed' ? 'Stopped early' : v.intents.length ? `${reached(v)} of ${v.intents.length} goals reached` : 'Looked around'} · {n === 0 ? 'no problems' : n === 1 ? '1 problem' : `${n} problems`}
                  </span>
                </button>
              )
            })}
          </div>
        )
      ) : null}

      {tab === 'about' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto px-5 py-5">
          <section>
            <h3 className="font-heading text-[18px] font-bold">{kind}</h3>
            <p className="mt-1 text-[16px] text-ink-2">{[u.description, kindText].filter(Boolean).join(' ')}</p>
          </section>
          <section>
            <h3 className="mb-2 font-heading text-[18px] font-bold">What {u.name} will try to do</h3>
            {u.goals.length === 0 ? (
              <p className="text-[16px] text-ink-2">No goals yet, so a visit would stop straight away. Ask Pikku to give {u.name} something to do.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {u.goals.map((g) => (
                  <li key={g} className="flex gap-2.5 text-[16px]">
                    <Check className="mt-0.5 size-5 shrink-0 text-accent-foreground" aria-hidden="true" />“{g}”
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[14px] text-ink-2">They only get the goal, never the steps, so they find their own way around, just like a real person.</p>
          </section>
          <section>
            <h3 className="mb-1 font-heading text-[18px] font-bold">What {u.name} is allowed to use</h3>
            <p className="text-[16px] text-ink-2">
              {u.disposition === 'auditor'
                ? 'Can look at everything their role allows, but nothing that would change data.'
                : u.disposition === 'adversarial'
                  ? 'Is shown everything on purpose, to check that their role really keeps them out.'
                  : u.roles.length
                    ? `Can use whatever the ${u.roles.join(' and ')} role allows. Everything else is off-limits.`
                    : 'Can use the parts of your app that anyone can.'}
            </p>
          </section>
          <section className="rounded-card bg-secondary p-4 text-[15px] text-ink-2">
            <b className="block text-foreground">Safe to try</b>
            Visits only go to your preview site, never to your live site or real customers. A visit ends after 40 actions, or sooner if they finish. Each one uses a little AI credit, which is why nothing runs until you ask.
          </section>
        </div>
      ) : null}

      {tab === 'own' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-5 py-5">
          <p className="text-[16px] text-ink-2">
            {on ? `${u.name} turns up at a random time, so nobody is watching when they find something.` : `${u.name} only visits when you send them. Turn this on and they will turn up by themselves.`}
          </p>
          <Button variant={on ? 'bordered' : 'default'} size="page" className="self-start" disabled={save.isPending} onClick={() => save.mutate({ persona: u.id, enabled: !on })}>
            {on ? 'Stop visiting on their own' : `Let ${u.name} visit on their own`}
          </Button>
          {on ? (
            <div className="flex flex-col gap-2">
              <b className="text-[16px]">How often</b>
              <Segmented label="How often" value={gap} options={GAPS.map(([id, text]) => [id, text])} onChange={(id) => { const g = GAPS.find((x) => x[0] === id)!; save.mutate({ persona: u.id, minIntervalMs: g[2], maxIntervalMs: g[3] }) }} />
              {u.schedule ? <small className="text-[14px] text-ink-2">Next visit {ago(u.schedule.nextRunAt)}</small> : null}
            </div>
          ) : null}
          <p className="rounded-card bg-secondary p-4 text-[15px] text-ink-2">
            <b className="block text-foreground">Costs a little each time</b>
            Every visit uses AI credit, even when nobody is watching. That is why this is switched on here and never from code.
          </p>
          {save.isError ? <ErrorState error={save.error} what={`Changing how ${u.name} visits`} onRetry={() => save.reset()} /> : null}
        </div>
      ) : null}
    </aside>
  )
}
