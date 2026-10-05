import { useContext, useEffect, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, Check, ChevronDown, ChevronUp, History, Play, Radio, SkipBack, SkipForward, TriangleAlert, Workflow, X } from 'lucide-react'
import { WorkflowGraphView } from '@pikku/studio-workflow-graph'
import { Button } from '../ui/button'
import { PikkuDot } from '../blocks/PikkuDot'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { useRoutines } from '../lib/routines'
import { useProjectKey } from '../lib/project'
import { eventsOf, stateAt, toMeta, toRun, type Ev, type Routine, type Run, type StepState } from '../lib/routines'
import { SidePanel } from '../blocks/SidePanel'
import { keep } from '../lib/links'
import { ShellCtx } from '../lib/shell'


const sample = {
  stateWord: { failed: 'Went wrong', waiting: 'Not reached', done: 'Done', skipped: 'Skipped', running: 'Working on it' } as Record<StepState, string>,
  evWord: { started: 'Started', retried: 'Tried again', done: 'Finished', failed: 'Went wrong' } as Record<Ev['type'], string>,
  dot: { done: 'bg-success', failed: 'bg-destructive', running: 'bg-info', waiting: 'bg-muted-foreground/40', skipped: 'bg-muted-foreground/40' } as Record<StepState, string>,
}

const secs = (ms: number) => `${(ms / 1000).toFixed(1)} seconds`

export function RoutineScreen({ id }: { id: string }) {
  const { data: routines = [] } = useRoutines(useProjectKey())
  const r = routines.find((x) => x.id === id)
  if (!r) return <p className="text-[17px] text-ink-2">That routine is not here. It may have been removed.</p>
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
    setLive({ ...base, id: 'live', when: 'Just now', note: 'Running now', took: 'a few seconds', older: undefined })
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
          <small className="block text-[14px] font-semibold text-muted-foreground">Routines</small>
          <h1 className="text-[28px] leading-[1.15] font-bold tracking-[-0.012em]">{r.name}</h1>
          <p className="text-[15px] text-ink-2">
            {r.what} {r.runs}.
          </p>
        </span>
        <Button variant="default" size="compact" disabled={running} onClick={runNow}>
          <Play className="size-4" aria-hidden="true" />
          Run it now
        </Button>
        <Button variant="bordered" size="compact" asChild>
          <Link {...keep} to={'/routines' as never}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            All routines
          </Link>
        </Button>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="bordered" size="compact" onClick={() => (setPick(null), setHist(true))}>
          <History className="size-4" aria-hidden="true" />
          Show history
        </Button>
        <span className="text-[14px] text-ink-2">
          {run ? (
            <>
              <b className="text-foreground">{run.when}</b>. {run.note}. Took {run.took}.
            </>
          ) : (
            'Just the routine, no run picked.'
          )}
        </span>
      </div>

      {run?.older && (
        <div role="status" className="flex items-center gap-3 rounded-card border border-warning bg-card px-4 py-2.5 text-[15px]">
          <History className="size-5 shrink-0 text-ink-2" aria-hidden="true" />
          This is how the routine looked then. It has changed since.
          <Button variant="bordered" size="compact" className="ml-auto" onClick={() => choose(r.history[0].id)}>
            Show it now
          </Button>
        </div>
      )}

      {run && !run.ok && run.why && atEnd && (
        <div className="flex flex-wrap items-center gap-3 rounded-card border border-warning bg-card px-4 py-2.5">
          <PikkuDot />
          <p className="min-w-0 flex-1 basis-80 text-[15px] leading-[1.4]">{run.why}</p>
          {r.history[0].id === run.id && (
            <Button variant="default" size="compact" onClick={() => say(`Fix this: ${r.name} ${run.note}`)}>
              Fix it for me
            </Button>
          )}
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-card border border-border bg-card shadow-card">{client && <WorkflowGraphView workflow={meta} direction="RIGHT" host={host} onPaneClick={() => setPick(null)} />}</div>

      {run && events.length > 0 && (
        <section data-testid="run-timeline" aria-label="Timeline of this run" className="shrink-0 rounded-card border border-border bg-card px-4 py-2.5 shadow-card">
          <div className="flex flex-wrap items-center gap-3">
            <b className="text-[15px]">Timeline</b>
            <small className="text-[14px] text-ink-2">{atEnd ? (running ? 'Happening now' : 'The whole run') : `Step ${cursor! + 1} of ${events.length}`}</small>
            <span className="ml-auto flex items-center gap-1">
              {!atEnd && (
                <Button variant="ghost" size="compact" onClick={() => setCursor(null)}>
                  <Radio className="size-4" aria-hidden="true" />
                  {running ? 'Follow it live' : 'Show the whole run'}
                </Button>
              )}
              <button type="button" aria-label={open ? 'Hide the timeline' : 'Show the timeline'} onClick={() => setOpen(!open)} className="grid size-9 place-items-center rounded-full text-ink-2 hover:bg-secondary">
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
                <button type="button" aria-label="Back one step" disabled={cur <= 0} onClick={() => setCursor(Math.max(0, cur - 1))} className="grid size-9 place-items-center rounded-full border border-border text-ink-2 hover:bg-secondary disabled:opacity-40">
                  <SkipBack className="size-4" />
                </button>
                <input type="range" aria-label="Move through the run" min={0} max={events.length - 1} value={cur} onChange={(e) => setCursor(Number(e.target.value))} className="h-2 min-w-0 flex-1 accent-[var(--color-ring)]" />
                <button type="button" aria-label="Forward one step" disabled={cur >= events.length - 1} onClick={() => setCursor(cur + 1 >= events.length - 1 && !running ? null : cur + 1)} className="grid size-9 place-items-center rounded-full border border-border text-ink-2 hover:bg-secondary disabled:opacity-40">
                  <SkipForward className="size-4" />
                </button>
              </div>
              {last && lastStep && (
                <p className="flex flex-wrap items-center gap-x-2 text-[14px] text-ink-2">
                  <i className={`size-2 rounded-full ${sample.dot[states[last.step]]}`} aria-hidden="true" />
                  <b className="text-foreground">{lastStep.title}</b>
                  {sample.evWord[last.type]} after {secs(last.at)}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {hist && (
        <SidePanel title="Past runs" sub="Pick one to see how it went, step by step." onClose={() => setHist(false)}>
          <RowStack>
            <RowCard tile={<Workflow className="size-5" />} on={runId === null} title="Just the routine" caption="No run, only the steps">
              <Button variant={runId === null ? 'default' : 'bordered'} size="compact" aria-pressed={runId === null} onClick={() => choose(null)}>
                {runId === null ? 'Showing' : 'Show it'}
              </Button>
            </RowCard>
            {live && (
              <RowCard tile={<Play className="size-5" />} on={runId === 'live'} title="Just now" caption={running ? 'Running now' : 'Finished'}>
                <Dot tone={running ? 'warn' : 'ok'}>{running ? 'Running' : 'Worked'}</Dot>
                <Button variant={runId === 'live' ? 'default' : 'bordered'} size="compact" aria-pressed={runId === 'live'} onClick={() => choose('live')}>
                  {runId === 'live' ? 'Showing' : 'Show it'}
                </Button>
              </RowCard>
            )}
            {r.history.map((h) => (
              <RowCard key={h.id} flag={!h.ok} on={h.id === runId} tile={h.ok ? <Check className="size-5" /> : <TriangleAlert className="size-5" />} title={h.when} caption={h.note} note={`Took ${h.took}`}>
                <Dot tone={h.ok ? 'ok' : 'bad'}>{h.ok ? 'Worked' : 'Went wrong'}</Dot>
                <Button variant={h.id === runId ? 'default' : 'bordered'} size="compact" aria-pressed={h.id === runId} onClick={() => choose(h.id)}>
                  {h.id === runId ? 'Showing' : 'Show it'}
                </Button>
              </RowCard>
            ))}
          </RowStack>
        </SidePanel>
      )}

      {step && (
        <SidePanel title={step.title} sub={step.by ? `Done by the ${step.by}` : undefined} onClose={() => setPick(null)}>
          <p className="text-[16px] text-ink-2">{step.says}</p>
          {step.ifNot && <p className="text-[15px] text-ink-2">If not: {step.ifNot}.</p>}
          {run ? (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-[17px] font-bold">What happened</h3>
                <Dot tone={states[step.id] === 'done' ? 'ok' : states[step.id] === 'failed' ? 'bad' : states[step.id] === 'running' ? 'warn' : 'quiet'}>{sample.stateWord[states[step.id] ?? 'waiting']}</Dot>
                {mine.length > 0 && (
                  <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[15px]">
                    <dt className="text-ink-2">Started</dt>
                    <dd>{secs(mine[0].at)} in</dd>
                    {mine.length > 1 && !running && (
                      <>
                        <dt className="text-ink-2">Ended</dt>
                        <dd>{secs(mine[mine.length - 1].at)} in</dd>
                        <dt className="text-ink-2">Took</dt>
                        <dd>{secs(mine[mine.length - 1].at - mine[0].at)}</dd>
                      </>
                    )}
                    <dt className="text-ink-2">Tries</dt>
                    <dd>{mine.filter((e) => e.type !== 'done' && e.type !== 'failed').length}</dd>
                  </dl>
                )}
              </div>

              {mine.filter((e) => e.type === 'retried' || e.type === 'failed').length > 0 && mine.length > 2 && (
                <div className="flex flex-col gap-2">
                  <h3 className="text-[17px] font-bold">Each try</h3>
                  <ol className="flex flex-col gap-1.5 text-[15px]">
                    {mine.map((e, i) => (
                      <li key={e.seq} className="flex items-center gap-2 text-ink-2">
                        <i className={`size-2 rounded-full ${e.type === 'failed' || e.type === 'retried' ? 'bg-destructive' : e.type === 'done' ? 'bg-success' : 'bg-info'}`} aria-hidden="true" />
                        {sample.evWord[e.type]}, {secs(e.at)} in{i === 0 ? '' : ''}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {note?.in && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-bold">What it was given</h3>
                  <p className="rounded-card bg-secondary px-3 py-2 text-[15px]">{note.in}</p>
                </div>
              )}
              {note?.out && states[step.id] === 'done' && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-bold">What it gave back</h3>
                  <p className="rounded-card bg-secondary px-3 py-2 text-[15px]">{note.out}</p>
                </div>
              )}
              {note?.error && states[step.id] === 'failed' && (
                <div className="flex flex-col gap-1">
                  <h3 className="text-[17px] font-bold">What went wrong</h3>
                  <p className="rounded-card bg-destructive-soft px-3 py-2 text-[15px] text-destructive">{note.error}</p>
                  {note.code && (
                    <details className="text-[14px] text-ink-2">
                      <summary className="cursor-pointer font-semibold">For a developer</summary>
                      <p className="mt-1 font-mono">{note.code}</p>
                    </details>
                  )}
                </div>
              )}
            </>
          ) : (
            <p className="text-[15px] text-ink-2">Pick a run above to see what happened here.</p>
          )}
          <div className="flex flex-wrap gap-3">
            <Button variant="bordered" size="compact" onClick={() => say(`Change the step "${step.title}" in "${r.name}"`)}>
              <PikkuDot />
              Ask Pikku to change this
            </Button>
            <Button variant="ghost" size="compact" onClick={() => setPick(null)}>
              <X className="size-4" aria-hidden="true" />
              Close
            </Button>
          </div>
        </SidePanel>
      )}
    </div>
  )
}
