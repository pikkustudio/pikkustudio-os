import { asI18n, sep, type I18nString } from '@pikku/react'
import { m } from '@/i18n/messages'
import { useEffect, useState } from 'react'
import { ArrowLeft, Check, CircleAlert, X } from 'lucide-react'
import { Button } from '../ui/button'
import { Segmented } from './Segmented'
import { ErrorState } from './ErrorState'
import { useProjectAction } from '../lib/projectRpc'
import { FOUND, goalWord, kindOf, ago, outcome, problemsOf, reached, type Run, type VirtualUser } from '../lib/virtualUsers'

type Tab = 'visits' | 'about' | 'own'

const DAY = 86_400_000
const GAPS = (): [string, I18nString, number, number][] => [
  ['day', m.virtual_user_drawer__gap_day(), DAY * 0.5, DAY * 1.5],
  ['few', m.virtual_user_drawer__gap_few(), DAY * 2, DAY * 4],
  ['week', m.virtual_user_drawer__gap_week(), DAY * 5, DAY * 9],
]

const gapOf = (min: number) => (min <= DAY ? 'day' : min <= DAY * 3 ? 'few' : 'week')

function Report({ u, run, onBack }: { u: VirtualUser; run: Run; onBack: () => void }) {
  const problems = problemsOf(run)
  const mins = run.finishedAt ? Math.max(1, Math.round((new Date(run.finishedAt).getTime() - new Date(run.createdAt).getTime()) / 60_000)) : null
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-5 py-5">
      <Button variant="bordered" size="compact" className="self-start" onClick={onBack}>
        <ArrowLeft className="rtl:-scale-x-100 size-4" aria-hidden="true" />
        {m.virtual_user_drawer__all_visits()}
      </Button>
      <div>
        <h3 className="font-heading text-[22px] leading-[1.2] font-bold">{outcome(u.name, run)}</h3>
        <p className="mt-1 text-[15px] text-ink-2">
          {m.virtual_user_drawer__report_meta({ ago: ago(run.createdAt), duration: mins ? ` · ${m.virtual_user_drawer__minute_count({ n: mins })}` : '' })}
        </p>
        <p className="mt-2 text-[16px] text-ink-2">{problems.length === 0 ? m.virtual_user_drawer__no_problems() : m.virtual_user_drawer__ran_into({ n: problems.length })}</p>
      </div>
      {run.status === 'failed' && run.error ? (
        <div className="rounded-card border border-border bg-secondary p-4 text-[15px] text-ink-2">
          <b className="block text-foreground">{m.virtual_user_drawer__stopped_early_title()}</b>
          {asI18n(run.error)}
        </div>
      ) : null}
      {problems.length > 0 ? (
        <section>
          <h4 className="mb-2 font-heading text-[18px] font-bold">{m.virtual_user_drawer__what_found()}</h4>
          <ul className="flex flex-col gap-2.5">
            {problems.map((p, i) => (
              <li key={i} className="flex gap-3 rounded-card border border-destructive/40 bg-card p-3.5">
                <CircleAlert className="mt-0.5 size-5 shrink-0 text-destructive" aria-hidden="true" />
                <span className="text-[16px]">
                  <b className="block">{FOUND(u.name, p.kind, p.detail)}</b>
                  {p.goal ? <span className="block text-[14px] text-ink-2">{m.virtual_user_drawer__while_trying({ goal: p.goal })}</span> : null}
                  <span className="block text-[14px] text-ink-2">{m.virtual_user_drawer__times({ n: p.count })}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      {run.intents.length > 0 ? (
        <section>
          <h4 className="mb-2 font-heading text-[18px] font-bold">{m.virtual_user_drawer__what_tried()}</h4>
          <ul className="flex flex-col divide-y divide-border rounded-card border border-border bg-card">
            {run.intents.map((i) => (
              <li key={i.id} className="flex items-center justify-between gap-3 px-4 py-3 text-[16px]">
                <span>{asI18n(i.title)}</span>
                <span className={`flex shrink-0 items-center gap-1.5 text-[14px] font-semibold ${i.status === 'completed' ? 'text-accent-foreground' : 'text-ink-2'}`}>
                  {i.status === 'completed' ? <Check className="size-4" aria-hidden="true" /> : null}
                  {goalWord(i.status)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <p className="text-[14px] text-ink-2">{m.virtual_user_drawer__no_guarantee()}</p>
    </div>
  )
}

export function VirtualUserDrawer({ u, projectKey, start, onClose }: { u: VirtualUser; projectKey: string; start: Tab; onClose: () => void }) {
  const [tab, setTab] = useState<Tab>(start)
  const [open, setOpen] = useState<string | null>(null)
  const save = useProjectAction<{ persona: string; enabled?: boolean; minIntervalMs?: number; maxIntervalMs?: number }>(projectKey, 'console:setVirtualUserSchedule', ['console:getVirtualUserSchedules'])
  const [kind, kindText] = kindOf(u.disposition)
  const initial = u.name.charAt(0)
  const run = u.visits.find((v) => v.runId === open)
  const on = !!u.schedule?.enabled
  const gap = gapOf(u.schedule?.minIntervalMs ?? DAY * 2)

  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])

  const tabBtn = (id: Tab, label: I18nString) => (
    <button type="button" role="tab" aria-selected={tab === id} onClick={() => (setTab(id), setOpen(null))} className={`border-b-[3px] px-4 py-3 text-[16px] font-semibold ${tab === id ? 'border-primary text-accent-foreground' : 'border-transparent text-ink-2'}`}>
      {label}
    </button>
  )

  return (
    <aside aria-label={m.virtual_user_drawer__aria({ name: u.name })} className="fixed inset-y-0 end-0 z-50 flex w-102 max-w-full flex-col border-s border-border bg-card shadow-[0_24px_56px_-14px_rgba(8,40,52,0.45)] @min-[1700px]/app:w-120">
      <header data-hue="petrol" className="flex items-center gap-3 bg-hero px-5 pt-4 pb-4 text-hero-ink">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white font-heading text-[24px] font-bold text-hero-btn-ink" aria-hidden="true">
          {asI18n(initial)}
        </span>
        <span className="min-w-0 flex-1">
          <h2 className="font-heading text-[22px] leading-[1.15] font-bold tracking-[-0.012em]">{u.name}</h2>
          <small className="block text-[14px] text-hero-ink-2">{u.job ? <>{u.job}{sep(' · ')}</> : null}{kind}</small>
        </span>
        <button type="button" aria-label={m.common__close()} onClick={onClose} className="grid size-11 place-items-center rounded-full text-hero-ink transition-colors hover:bg-white/15">
          <X className="size-5.5" />
        </button>
      </header>

      <div className="flex gap-1 border-b border-border px-3" role="tablist">
        {tabBtn('about', m.virtual_user_drawer__tab_about())}
        {tabBtn('visits', m.virtual_user_drawer__tab_visits({ n: u.visits.length }))}
        {tabBtn('own', m.virtual_user_drawer__tab_own())}
      </div>

      {tab === 'visits' ? (
        run ? (
          <Report u={u} run={run} onBack={() => setOpen(null)} />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-5">
            {u.visiting ? (
              <div role="status" className="rounded-card bg-accent p-4 text-[15px] text-accent-foreground">
                <b className="block">{m.virtual_user_drawer__on_visit_title({ name: u.name })}</b>
                {m.virtual_user_drawer__on_visit_text()}
              </div>
            ) : null}
            {u.visits.length === 0 && !u.visiting ? <p className="text-[16px] text-ink-2">{m.virtual_user_drawer__not_visited({ name: u.name })}</p> : null}
            {u.visits.map((v) => {
              const n = problemsOf(v).length
              return (
                <button key={v.runId} type="button" onClick={() => setOpen(v.runId)} className="flex flex-col gap-0.5 rounded-card border border-border bg-card px-4 py-3 text-start transition-colors hover:bg-secondary">
                  <b className="text-[16px]">{ago(v.createdAt)}</b>
                  <span className="text-[15px] text-ink-2">
                    {m.virtual_user_drawer__visit_summary({ outcome: v.status === 'failed' ? m.virtual_user_drawer__stopped_early() : v.intents.length ? m.virtual_user_drawer__goals_reached({ reached: reached(v), total: v.intents.length }) : m.virtual_user_drawer__looked_around(), problems: n === 0 ? m.virtual_user_drawer__summary_no_problems() : m.virtual_user_drawer__summary_problems({ n }) })}
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
            <p className="mt-1 text-[16px] text-ink-2">{u.description ? <>{u.description}{sep(' ')}</> : null}{kindText}</p>
          </section>
          <section>
            <h3 className="mb-2 font-heading text-[18px] font-bold">{m.virtual_user_drawer__will_try({ name: u.name })}</h3>
            {u.goals.length === 0 ? (
              <p className="text-[16px] text-ink-2">{m.virtual_user_drawer__no_goals({ name: u.name })}</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {u.goals.map((g) => (
                  <li key={g} className="flex gap-2.5 text-[16px]">
                    <Check className="mt-0.5 size-5 shrink-0 text-accent-foreground" aria-hidden="true" />{m.virtual_user_drawer__goal_quote({ goal: g })}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[14px] text-ink-2">{m.virtual_user_drawer__goal_only()}</p>
          </section>
          <section>
            <h3 className="mb-1 font-heading text-[18px] font-bold">{m.virtual_user_drawer__allowed({ name: u.name })}</h3>
            <p className="text-[16px] text-ink-2">
              {u.disposition === 'auditor'
                ? m.virtual_user_drawer__allowed_auditor()
                : u.disposition === 'adversarial'
                  ? m.virtual_user_drawer__allowed_adversarial()
                  : u.roles.length
                    ? m.virtual_user_drawer__allowed_roles({ roles: new Intl.ListFormat(undefined, { type: 'conjunction' }).format(u.roles) })
                    : m.virtual_user_drawer__allowed_anyone()}
            </p>
          </section>
          <section className="rounded-card bg-secondary p-4 text-[15px] text-ink-2">
            <b className="block text-foreground">{m.virtual_user_drawer__safe_title()}</b>
            {m.virtual_user_drawer__safe_text()}
          </section>
        </div>
      ) : null}

      {tab === 'own' ? (
        <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-auto px-5 py-5">
          <p className="text-[16px] text-ink-2">
            {on ? m.virtual_user_drawer__own_on({ name: u.name }) : m.virtual_user_drawer__own_off({ name: u.name })}
          </p>
          <Button variant={on ? 'bordered' : 'default'} size="page" className="self-start" disabled={save.isPending} onClick={() => save.mutate({ persona: u.id, enabled: !on })}>
            {on ? m.virtual_user_drawer__stop_own() : m.virtual_user_drawer__start_own({ name: u.name })}
          </Button>
          {on ? (
            <div className="flex flex-col gap-2">
              <b className="text-[16px]">{m.virtual_user_drawer__how_often()}</b>
              <Segmented label={m.virtual_user_drawer__how_often()} value={gap} options={GAPS().map(([id, text]) => [id, text])} onChange={(id) => { const g = GAPS().find((x) => x[0] === id)!; save.mutate({ persona: u.id, minIntervalMs: g[2], maxIntervalMs: g[3] }) }} />
              {u.schedule ? <small className="text-[14px] text-ink-2">{m.virtual_user_drawer__next_visit({ ago: ago(u.schedule.nextRunAt) })}</small> : null}
            </div>
          ) : null}
          <p className="rounded-card bg-secondary p-4 text-[15px] text-ink-2">
            <b className="block text-foreground">{m.virtual_user_drawer__cost_title()}</b>
            {m.virtual_user_drawer__cost_text()}
          </p>
          {save.isError ? <ErrorState error={save.error} what={m.virtual_user_drawer__changing_visits({ name: u.name })} onRetry={() => save.reset()} /> : null}
        </div>
      ) : null}
    </aside>
  )
}
