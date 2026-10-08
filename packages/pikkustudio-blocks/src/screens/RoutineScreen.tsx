import { m } from '@/i18n/messages'
import { useContext, useEffect, useMemo, useState } from 'react'
import { Link } from '../blocks/Link'
import { ArrowLeft, Check, ChevronDown, ChevronUp, History, Play, Radio, SkipBack, SkipForward, TriangleAlert, Workflow, X } from 'lucide-react'
import { asI18n, completeMessages, type I18nString } from '@pikku/react'
import { WorkflowGraphView, type CompleteWorkflowGraphMessages } from '@pikku/studio-workflow-graph'
import { Button } from '../ui/button'
import { PikkuDot } from '../blocks/PikkuDot'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { useRoutines } from '../lib/routines'
import { useProjectKey } from '../lib/project'
import { eventsOf, stateAt, toMeta, toRun, type Ev, type Routine, type Run, type StepState } from '../lib/routines'
import { SidePanel } from '../blocks/SidePanel'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'

/** The graph library takes its words from the host; these wrap the catalog so a locale change is read at draw time. Module-level so the graph sees one stable object. */
const graphMessages = completeMessages<CompleteWorkflowGraphMessages>({
  node_inline: () => m.workflow_graph__node_inline(),
  node_generic: () => m.workflow_graph__node_generic(),
  node_branch: () => m.workflow_graph__node_branch(),
  node_cancel: () => m.workflow_graph__node_cancel(),
  node_loop: () => m.workflow_graph__node_loop(),
  node_filter: () => m.workflow_graph__node_filter(),
  node_parallel: () => m.workflow_graph__node_parallel(),
  node_return: () => m.workflow_graph__node_return(),
  node_set: () => m.workflow_graph__node_set(),
  node_sleep: () => m.workflow_graph__node_sleep(),
  node_suspend: () => m.workflow_graph__node_suspend(),
  node_switch: () => m.workflow_graph__node_switch(),
  node_some: () => m.workflow_graph__node_some(),
  node_every: () => m.workflow_graph__node_every(),
  node_check: () => m.workflow_graph__node_check(),
  node_message_router: () => m.workflow_graph__node_message_router(),
  node_channel_wiring: () => m.workflow_graph__node_channel_wiring(),
  node_channel: () => m.workflow_graph__node_channel(),
  wiring_http: () => m.workflow_graph__wiring_http(),
  wiring_queue: () => m.workflow_graph__wiring_queue(),
  wiring_cli: () => m.workflow_graph__wiring_cli(),
  wiring_mcp_tool: () => m.workflow_graph__wiring_mcp_tool(),
  wiring_mcp_prompt: () => m.workflow_graph__wiring_mcp_prompt(),
  wiring_mcp_resource: () => m.workflow_graph__wiring_mcp_resource(),
  wiring_schedule: () => m.workflow_graph__wiring_schedule(),
  wiring_trigger: () => m.workflow_graph__wiring_trigger(),
  handle_if: () => m.workflow_graph__handle_if(),
  handle_elif: ({ n }) => m.workflow_graph__handle_elif({ n }),
  handle_else: () => m.workflow_graph__handle_else(),
  handle_next: () => m.workflow_graph__handle_next(),
  handle_each: () => m.workflow_graph__handle_each(),
  handle_done: () => m.workflow_graph__handle_done(),
  handler_on_connect: () => m.workflow_graph__handler_on_connect(),
  handler_on_disconnect: () => m.workflow_graph__handler_on_disconnect(),
  handler_on_message: () => m.workflow_graph__handler_on_message(),
  handle_default: () => m.workflow_graph__handle_default(),
  handle_after: () => m.workflow_graph__handle_after(),
  edge_then: () => m.workflow_graph__edge_then(),
  edge_else: () => m.workflow_graph__edge_else(),
  edge_branch: ({ n }) => m.workflow_graph__edge_branch({ n }),
  edge_default: () => m.workflow_graph__edge_default(),
  edge_on_error: () => m.workflow_graph__edge_on_error(),
  status_done: () => m.workflow_graph__status_done(),
  status_running: () => m.workflow_graph__status_running(),
  status_failed: () => m.workflow_graph__status_failed(),
  status_pending: () => m.workflow_graph__status_pending(),
  status_suspended: () => m.workflow_graph__status_suspended(),
  status_cancelled: () => m.workflow_graph__status_cancelled(),
  status_scheduled: () => m.workflow_graph__status_scheduled(),
  status_skipped: () => m.workflow_graph__status_skipped(),
  not_wired: () => m.workflow_graph__not_wired(),
  triggered_this_run: () => m.workflow_graph__triggered_this_run(),
  selected: () => m.workflow_graph__selected(),
  referenced: () => m.workflow_graph__referenced(),
  auth: () => m.workflow_graph__auth(),
  open: () => m.workflow_graph__open(),
  permissions: () => m.workflow_graph__permissions(),
  middleware: () => m.workflow_graph__middleware(),
  retries: () => m.workflow_graph__retries(),
  retries_value: ({ n }) => m.workflow_graph__retries_value({ n }),
  retry_delay: () => m.workflow_graph__retry_delay(),
  retry_delay_value: ({ n }) => m.workflow_graph__retry_delay_value({ n }),
  none: () => m.workflow_graph__none(),
  scroll_sideways: () => m.workflow_graph__scroll_sideways(),
  scroll_vertical: () => m.workflow_graph__scroll_vertical(),
})


const sample = {
  stateWord: { failed: m.routine_screen__state_failed, waiting: m.routine_screen__state_waiting, done: m.routine_screen__state_done, skipped: m.routine_screen__state_skipped, running: m.routine_screen__state_running } as Record<StepState, () => I18nString>,
  evWord: { started: m.routine_screen__started, retried: m.routine_screen__tried_again, done: m.routine_screen__finished, failed: m.routine_screen__went_wrong } as Record<Ev['type'], () => I18nString>,
  dot: { done: 'bg-success', failed: 'bg-destructive', running: 'bg-info', waiting: 'bg-muted-foreground/40', skipped: 'bg-muted-foreground/40' } as Record<StepState, string>,
}

const secs = (ms: number): I18nString => m.routine_screen__seconds({ n: (ms / 1000).toFixed(1) })

export function RoutineScreen({ id }: { id: string }) {
  const { data: routines = [] } = useRoutines(useProjectKey())
  const r = routines.find((x) => x.id === id)
  if (!r) return <p className="text-[17px] text-ink-2">{m.routine_screen__missing()}</p>
  return <Detail key={r.id} r={r} />
}

function Detail({ r }: { r: Routine }) {
  const { say } = useContext(ShellCtx)
  const [runId, setRunId] = useState<string | null>(r.history[0]?.id ?? null)
  const [live, setLive] = useState<Run | null>(null)
  const [shown, setShown] = useState(0)
  const [cursor, setCursor] = useState<number | null>(null)
  const [open, setOpen] = useState(true)
  const [pick, setPick] = useState<string | null>(null)
  const [hist, setHist] = useState(false)
  const [client, setClient] = useState(false)
  useEffect(() => setClient(true), [])

  const run = runId === 'live' ? live : (r.history.find((x) => x.id === runId) ?? null)
  const steps = run?.older ?? r.steps
  const all = useMemo(() => (run ? eventsOf(steps, run) : []), [run, steps])
  const events = run?.id === 'live' ? all.slice(0, shown) : all
  const running = run?.id === 'live' && shown < all.length

  useEffect(() => {
    if (!running) return
    const t = setTimeout(() => setShown((n) => n + 1), 900)
    return () => clearTimeout(t)
  }, [running, shown])

  const upTo = cursor === null ? events.length : cursor + 1
  const states = useMemo(() => stateAt(steps, events, upTo), [steps, events, upTo])
  const atEnd = cursor === null
  const step = steps.find((s) => s.id === pick)
  const note = run && step ? run.notes?.[step.id] : undefined
  const mine = events.filter((e) => e.step === pick && events.indexOf(e) < upTo)
  const meta = useMemo(() => toMeta(r, steps), [r, steps])
  const host = useMemo(
    () => ({ run: run ? toRun(r, run, states, running) : null, focusedNodeId: pick, openWorkflowStep: (id: string) => (setHist(false), setPick(id)) }),
    [r, run, states, running, pick],
  )

  const choose = (id: string | null) => (setRunId(id), setCursor(null), setPick(null), setHist(false))
  const runNow = () => {
    const base = r.history.find((h) => h.ok) ?? r.history[0]
    if (!base) return
    setLive({ ...base, id: 'live', when: m.routine_screen__just_now(), note: m.routine_screen__running_now(), took: m.routine_screen__a_few_seconds(), older: undefined })
    setShown(0)
    choose('live')
  }

  const cur = cursor === null ? events.length - 1 : cursor
  const last = events[cur]
  const lastStep = last && steps.find((s) => s.id === last.step)
  const path = steps.filter((s) => events.some((e) => e.step === s.id))
  const firstSeq = (id: string) => events.findIndex((e) => e.step === id)
  const settled = (id: string) => events.reduce((n, e, i) => (e.step === id ? i : n), 0)

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span className="min-w-0 flex-1 basis-80">
          <small className="block text-[14px] font-semibold text-muted-foreground">{m.quick_find__routines()}</small>
          <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.012em]">{asI18n(r.name)}</h1>
          <p className="text-[15px] text-ink-2">
            {m.routine_screen__what_runs({ what: r.what, runs: r.runs })}
          </p>
        </span>
        <Button variant="default" size="compact" disabled={running} onClick={runNow}>
          <Play className="size-4" aria-hidden="true" />
          {m.routine_screen__run_now()}
        </Button>
        <Button variant="bordered" size="compact" asChild>
          <Link {...keep} to={'/routines' as never}>
            <ArrowLeft className="rtl:-scale-x-100 size-4" aria-hidden="true" />
            {m.routine_screen__all_routines()}
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="bordered" size="compact" onClick={() => (setPick(null), setHist(true))}>
          <History className="size-4" aria-hidden="true" />
          {m.routine_screen__show_history()}
        </Button>
        <span className="text-[14px] text-ink-2">
          {run ? (
            <>
              <b className="text-foreground">{run.when}</b>{m.routine_screen__run_summary({ note: run.note, took: run.took })}
            </>
          ) : (
            m.routine_screen__no_run_picked()
          )}
        </span>
      </div>

      {run?.older && (
        <div role="status" className="flex items-center gap-3 rounded-card border border-warning bg-card px-4 py-2.5 text-[15px]">
          <History className="size-5 shrink-0 text-ink-2" aria-hidden="true" />
          {m.routine_screen__older_notice()}
          <Button variant="bordered" size="compact" className="ms-auto" onClick={() => choose(r.history[0].id)}>
            {m.routine_screen__show_it_now()}
          </Button>
        </div>
      )}

      {run && !run.ok && !!run.why && atEnd && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-warning bg-card px-4 py-2.5">
          <PikkuDot />
          <p className="min-w-0 flex-1 basis-80 text-[15px] leading-[1.4]">{asI18n(run.why)}</p>
          {r.history[0].id === run.id && (
            <Button variant="default" size="compact" onClick={() => say(m.routine_screen__fix_say({ name: r.name, note: run.note }))}>
              {m.routine_screen__fix_it()}
            </Button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-card shadow-card">{client && <WorkflowGraphView workflow={meta} direction="RIGHT" host={host} messages={graphMessages} onPaneClick={() => setPick(null)} />}</div>

      {run && events.length > 0 && (
        <section data-testid="run-timeline" aria-label={m.routine_screen__timeline_aria()} className="shrink-0 rounded-card border border-border bg-card px-4 py-2.5 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <b className="text-[15px]">{m.routine_screen__timeline()}</b>
            <small className="text-[14px] text-ink-2">{atEnd ? (running ? m.routine_screen__happening_now() : m.routine_screen__whole_run()) : m.routine_screen__step_of({ step: cursor! + 1, total: events.length })}</small>
            <span className="ms-auto flex items-center gap-1">
              {!atEnd && (
                <Button variant="ghost" size="compact" onClick={() => setCursor(null)}>
                  <Radio className="size-4" aria-hidden="true" />
                  {running ? m.routine_screen__follow_live() : m.routine_screen__show_whole_run()}
                </Button>
              )}
              <button type="button" aria-label={open ? m.routine_screen__hide_timeline() : m.routine_screen__show_timeline()} onClick={() => setOpen(!open)} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-secondary">
                {open ? <ChevronDown className="size-5" /> : <ChevronUp className="size-5" />}
              </button>
            </span>
          </div>
          {open && (
            <div className="mt-2 flex flex-col gap-2.5">
              <div className="flex gap-1.5 overflow-x-auto pb-1 [scrollbar-width:thin]">
                {path.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => (setCursor(settled(s.id)), setPick(s.id))}
                    className={`flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-[14px] ${last?.step === s.id ? 'border-ring bg-accent text-accent-foreground' : 'border-border bg-secondary text-ink-2'} ${firstSeq(s.id) >= upTo ? 'opacity-50' : ''}`}
                  >
                    <i className={`size-2 rounded-full ${sample.dot[states[s.id] ?? 'waiting']}`} aria-hidden="true" />
                    {s.title}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <button type="button" aria-label={m.routine_screen__back_step()} disabled={cur <= 0} onClick={() => setCursor(Math.max(0, cur - 1))} className="grid size-9 place-items-center rounded-full border border-border text-ink-2 hover:bg-secondary disabled:opacity-40">
                  <SkipBack className="size-4" />
                </button>
                <input type="range" aria-label={m.routine_screen__move_run()} min={0} max={events.length - 1} value={cur} onChange={(e) => setCursor(Number(e.target.value))} className="h-2 min-w-0 flex-1 accent-[var(--color-ring)]" />
                <button type="button" aria-label={m.routine_screen__forward_step()} disabled={cur >= events.length - 1} onClick={() => setCursor(cur + 1 >= events.length - 1 && !running ? null : cur + 1)} className="grid size-9 place-items-center rounded-full border border-border text-ink-2 hover:bg-secondary disabled:opacity-40">
                  <SkipForward className="size-4" />
                </button>
              </div>
              {last && lastStep && (
                <p className="flex flex-wrap items-center gap-x-2 text-[14px] text-ink-2">
                  <i className={`size-2 rounded-full ${sample.dot[states[last.step]]}`} aria-hidden="true" />
                  <b className="text-foreground">{lastStep.title}</b>
                  {m.routine_screen__event_after({ event: sample.evWord[last.type](), time: secs(last.at) })}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {hist && (
        <SidePanel title={m.routine_screen__past_runs()} sub={m.routine_screen__past_runs_sub()} onClose={() => setHist(false)}>
          <RowStack>
            <RowCard tile={<Workflow className="size-5" />} on={runId === null} title={m.routine_screen__just_routine()} caption={m.routine_screen__no_run()}>
              <Button variant={runId === null ? 'default' : 'bordered'} size="compact" aria-pressed={runId === null} onClick={() => choose(null)}>
                {runId === null ? m.routine_screen__showing() : m.routine_screen__show_it()}
              </Button>
            </RowCard>
            {live && (
              <RowCard tile={<Play className="size-5" />} on={runId === 'live'} title={m.routine_screen__just_now()} caption={running ? m.routine_screen__running_now() : m.routine_screen__finished()}>
                <Dot tone={running ? 'warn' : 'ok'}>{running ? m.projects_grid__running() : m.routine_screen__worked()}</Dot>
                <Button variant={runId === 'live' ? 'default' : 'bordered'} size="compact" aria-pressed={runId === 'live'} onClick={() => choose('live')}>
                  {runId === 'live' ? m.routine_screen__showing() : m.routine_screen__show_it()}
                </Button>
              </RowCard>
            )}
            {r.history.map((h) => (
              <RowCard key={h.id} flag={!h.ok} on={h.id === runId} tile={h.ok ? <Check className="size-5" /> : <TriangleAlert className="size-5" />} title={h.when} caption={h.note} note={m.routine_screen__took_line({ took: h.took })}>
                <Dot tone={h.ok ? 'ok' : 'bad'}>{h.ok ? m.routine_screen__worked() : m.routine_screen__went_wrong()}</Dot>
                <Button variant={h.id === runId ? 'default' : 'bordered'} size="compact" aria-pressed={h.id === runId} onClick={() => choose(h.id)}>
                  {h.id === runId ? m.routine_screen__showing() : m.routine_screen__show_it()}
                </Button>
              </RowCard>
            ))}
          </RowStack>
        </SidePanel>
      )}

      {step && (
        <SidePanel title={step.title} sub={step.by ? m.routine_screen__done_by({ by: step.by }) : undefined} onClose={() => setPick(null)}>
          <p className="text-[16px] text-ink-2">{step.says}</p>
          {step.ifNot && <p className="text-[15px] text-ink-2">{m.routine_screen__if_not({ ifNot: step.ifNot })}</p>}
          {run ? (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-[17px] font-bold">{m.routine_screen__what_happened()}</h3>
                <Dot tone={states[step.id] === 'done' ? 'ok' : states[step.id] === 'failed' ? 'bad' : states[step.id] === 'running' ? 'warn' : 'quiet'}>{sample.stateWord[states[step.id] ?? 'waiting']()}</Dot>
                {mine.length > 0 && (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
                    <dt className="text-ink-2">{m.routine_screen__started()}</dt>
                    <dd>{m.routine_screen__time_in({ time: secs(mine[0].at) })}</dd>
                    {mine.length > 1 && !running && (
                      <>
                        <dt className="text-ink-2">{m.routine_screen__ended()}</dt>
                        <dd>{m.routine_screen__time_in({ time: secs(mine[mine.length - 1].at) })}</dd>
                        <dt className="text-ink-2">{m.routine_screen__took()}</dt>
                        <dd>{secs(mine[mine.length - 1].at - mine[0].at)}</dd>
                      </>
                    )}
                    <dt className="text-ink-2">{m.routine_screen__tries()}</dt>
                    <dd>{mine.filter((e) => e.type !== 'done' && e.type !== 'failed').length}</dd>
                  </dl>
                )}
              </div>

              {mine.filter((e) => e.type === 'retried' || e.type === 'failed').length > 0 && mine.length > 2 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[17px] font-bold">{m.routine_screen__each_try()}</h3>
                  <ol className="flex flex-col gap-1.5 text-[15px]">
                    {mine.map((e) => (
                      <li key={e.seq} className="flex items-center gap-2 text-ink-2">
                        <i className={`size-2 rounded-full ${e.type === 'failed' || e.type === 'retried' ? 'bg-destructive' : e.type === 'done' ? 'bg-success' : 'bg-info'}`} aria-hidden="true" />
                        {m.routine_screen__event_at({ event: sample.evWord[e.type](), time: secs(e.at) })}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {!!note?.in && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-bold">{m.routine_screen__given()}</h3>
                  <p className="rounded-card bg-secondary px-3 py-2 text-[15px]">{asI18n(note.in)}</p>
                </div>
              )}
              {!!note?.out && states[step.id] === 'done' && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-bold">{m.routine_screen__gave_back()}</h3>
                  <p className="rounded-card bg-secondary px-3 py-2 text-[15px]">{asI18n(note.out)}</p>
                </div>
              )}
              {!!note?.error && states[step.id] === 'failed' && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-bold">{m.routine_screen__what_went_wrong()}</h3>
                  <p className="rounded-card bg-destructive-soft px-3 py-2 text-[15px] text-destructive">{asI18n(note.error)}</p>
                </div>
              )}
            </>
          ) : (
            <p className="text-[15px] text-ink-2">{m.routine_screen__pick_a_run()}</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="bordered" size="compact" onClick={() => say(m.routine_screen__change_step_say({ step: step.title, name: r.name }))}>
              <PikkuDot />
              {m.routine_screen__ask_pikku_change()}
            </Button>
            <Button variant="ghost" size="compact" onClick={() => setPick(null)}>
              <X className="size-4" aria-hidden="true" />
              {m.assistant_drawer__close()}
            </Button>
          </div>
        </SidePanel>
      )}
    </div>
  )
}
