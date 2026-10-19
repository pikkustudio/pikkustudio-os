import { asI18n, type I18nString } from '@pikku/react'
import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { m } from '@/i18n/messages'
import { getLocale } from '@/paraglide/runtime.js'
import { ProjectRpcCtx } from './projectRpc'

// Same shape the real workflow graph reads (steps with a flow or rpc name), written in the person's own words.
export type StepKind = 'when' | 'do' | 'ask' | 'wait' | 'end'
export type StepState = 'done' | 'failed' | 'skipped' | 'waiting' | 'running'
export type Step = { id: string; kind: StepKind; title: I18nString; says: I18nString; by?: I18nString; ifNot?: I18nString }
export type StepNote = { in?: string; out?: string; error?: string; code?: string; tries?: number }
export type Run = { id: string; when: I18nString; took: I18nString; ok: boolean; note: I18nString; wrongAt?: I18nString; steps: Record<string, StepState>; why?: string; notes?: Record<string, StepNote>; older?: Step[] }
/** One thing that happened in a run, in order. `at` is milliseconds since it began. */
export type Ev = { seq: number; step: string; type: 'started' | 'retried' | 'done' | 'failed'; at: number }
/** `cron` is set for a workflow that runs on a schedule; `runs` says when it runs, in words. */
export type Workflow = { id: string; name: string; what: string; runs: I18nString; cron?: string; on: boolean; steps: Step[]; history: Run[] }

const runWord: Record<StepState, string> = { done: 'completed', failed: 'failed', skipped: 'cancelled', waiting: 'pending', running: 'running' }

export function toMeta(r: Workflow, steps: Step[] = r.steps) {
  const nodes: Record<string, any> = {}
  const [when, ...rest] = steps
  rest.forEach((s, i) => {
    const next = rest[i + 1]?.id
    if (s.kind === 'end') nodes[s.id] = { flow: 'return', stepName: s.title, description: s.says }
    else if (s.kind === 'wait') nodes[s.id] = { flow: 'sleep', stepName: s.title, description: s.says, duration: m.workflows__quiet_moment(), next }
    else if (s.kind === 'ask') {
      nodes[s.id] = { flow: 'branch', stepName: s.title, condition: { expression: m.workflows__yes() }, thenEntry: next, elseEntry: `${s.id}-no` }
      nodes[`${s.id}-no`] = { flow: 'return', stepName: s.ifNot ?? m.workflows__stops_here() }
    } else nodes[s.id] = { rpcName: s.by ?? m.workflows__your_app(), stepName: s.title, description: s.says, next }
  })
  const start = rest[0].id
  return { name: r.name, steps: [], nodes, entryNodeIds: [start], wires: r.cron ? { schedule: [{ cron: r.cron, startNode: start }] } : { trigger: [{ name: when.title, startNode: start }] } }
}

/** A run as the graph reads it: the state of every step, and what started it. */
export function toRun(r: Workflow, run: Run, states: Record<string, StepState>, running = false) {
  return {
    runId: run.id,
    status: running ? 'running' : run.ok ? 'completed' : 'failed',
    wire: r.cron ? { type: 'scheduler', id: r.cron } : { type: 'trigger' },
    stepStates: new Map(Object.entries(states).map(([id, st]) => [id, { status: runWord[st] }])),
  }
}

/** Everything that happened in a run, in order, rebuilt from where each step ended up. */
export function eventsOf(steps: Step[], run: Run): Ev[] {
  const out: Ev[] = []
  let at = 0
  const add = (step: string, type: Ev['type']) => out.push({ seq: out.length, step, type, at: (at += 180 + ((out.length * 137) % 520)) })
  for (const s of steps) {
    const st = run.steps[s.id]
    if (!st || st === 'waiting' || st === 'skipped') continue
    add(s.id, 'started')
    const tries = run.notes?.[s.id]?.tries ?? 1
    for (let i = 1; i < tries; i++) add(s.id, 'retried')
    add(s.id, st === 'failed' ? 'failed' : 'done')
  }
  return out
}

/** Where every step stood after the first `upTo` events. */
export function stateAt(steps: Step[], events: Ev[], upTo: number): Record<string, StepState> {
  const m: Record<string, StepState> = Object.fromEntries(steps.map((s) => [s.id, 'waiting']))
  for (const e of events.slice(0, upTo)) m[e.step] = e.type === 'done' ? 'done' : e.type === 'failed' ? 'failed' : 'running'
  return m
}

type Node = { flow?: string; rpcName?: string; stepName?: string; description?: string; next?: string; thenEntry?: string; elseEntry?: string }
type WorkflowMeta = { scenario?: boolean; source?: string; nodes?: Record<string, Node>; entryNodeIds?: string[]; wires?: { schedule?: { cron: string }[]; trigger?: { name: string }[] } }
type RealStep = { stepId: string; status: string; result?: unknown; error?: { message?: string }; attemptCount?: number }
type RealRun = { id: string; status: string; error?: { message?: string }; createdAt: string; updatedAt: string }

const nice = (id: string) => id.replace(/[-_.]/g, ' ').replace(/^./, (c) => c.toUpperCase())
// Step names and descriptions come from the project's own workflows, so they are not ours to translate.
const say = (text: string): I18nString => asI18n(text)
const stateOf: Record<string, StepState> = { succeeded: 'done', failed: 'failed', running: 'running', scheduled: 'running', suspended: 'waiting', pending: 'waiting' }
const show = (v: unknown) => (v === undefined ? undefined : typeof v === 'string' ? v : JSON.stringify(v))

const stepsOf = (id: string, meta: WorkflowMeta): Step[] => {
  const nodes = meta.nodes ?? {}
  const cron = meta.wires?.schedule?.[0]?.cron
  const out: Step[] = [{ id: 'when', kind: 'when', title: cron ? m.workflows__on_a_schedule({ cron }) : meta.wires?.trigger?.[0]?.name ? say(meta.wires.trigger[0].name) : m.workflows__when_asked(), says: m.workflows__what_starts_it() }]
  const seen = new Set<string>()
  let cur: string | undefined = meta.entryNodeIds?.[0]
  while (cur && !seen.has(cur) && nodes[cur]) {
    seen.add(cur)
    const n: Node = nodes[cur]
    const title = say(n.stepName ?? nice(cur))
    if (n.flow === 'return') out.push({ id: cur, kind: 'end', title, says: say(n.description ?? '') })
    else if (n.flow === 'sleep') out.push({ id: cur, kind: 'wait', title, says: say(n.description ?? '') })
    else if (n.flow === 'branch') out.push({ id: cur, kind: 'ask', title, says: say(n.description ?? ''), ifNot: n.elseEntry ? say(nodes[n.elseEntry]?.stepName ?? '') : undefined })
    else out.push({ id: cur, kind: 'do', title, says: say(n.description ?? ''), by: n.rpcName ? say(nice(n.rpcName.replace(/^.*:/, ''))) : undefined })
    cur = n.flow === 'branch' ? n.thenEntry : n.next
  }
  return out
}

const dayOf = (iso: string): I18nString => {
  const text = new Date(iso).toLocaleString(getLocale(), { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
  return asI18n(text)
}

const runOf = (r: RealRun, steps: Step[], real: RealStep[]): Run => {
  const by = new Map(real.map((s) => [s.stepId, s]))
  const states: Record<string, StepState> = { when: 'done' }
  const notes: Record<string, StepNote> = {}
  for (const s of steps.slice(1)) {
    const x = by.get(s.id)
    states[s.id] = x ? (stateOf[x.status] ?? 'waiting') : 'waiting'
    if (x) notes[s.id] = { out: show(x.result), error: x.error?.message, tries: x.attemptCount }
  }
  const failed = steps.find((s) => states[s.id] === 'failed')
  const secs = Math.max(1, Math.round((new Date(r.updatedAt).getTime() - new Date(r.createdAt).getTime()) / 1000))
  return {
    id: r.id,
    when: dayOf(r.createdAt),
    took: m.workflows__took_seconds({ count: secs }),
    ok: r.status === 'completed',
    wrongAt: failed?.title,
    note: failed ? m.workflows__went_wrong_at({ step: failed.title }) : r.status === 'completed' ? m.workflows__ran_fine() : say(nice(r.status)),
    steps: states,
    why: r.error?.message ?? (failed ? notes[failed.id]?.error : undefined),
    notes,
  }
}

export const useWorkflows = (key: string) => {
  const invoke = useContext(ProjectRpcCtx)
  return useQuery<Workflow[]>({
    enabled: !!key,
    queryKey: ['project', key, 'workflows'],
    refetchInterval: 8000,
    retry: false,
    queryFn: async () => {
      const meta = (await invoke(key, 'console:getAllMeta', {})) as { workflows?: Record<string, WorkflowMeta> }
      return Promise.all(
        Object.entries(meta.workflows ?? {}).filter(([, w]) => !w.scenario && w.source !== 'scenario').map(async ([id, workflow]) => {
          const steps = stepsOf(id, workflow)
          const runs = ((await invoke(key, 'console:getWorkflowRuns', { workflowName: id, limit: 8 })) as RealRun[] | null) ?? []
          const history = await Promise.all(runs.map(async (r) => runOf(r, steps, ((await invoke(key, 'console:getWorkflowRunSteps', { runId: r.id })) as RealStep[] | null) ?? [])))
          const cron = workflow.wires?.schedule?.[0]?.cron
          return { id, name: nice(id), what: steps.find((s) => s.kind === 'do')?.says ?? '', runs: cron ? m.workflows__every({ cron }) : m.workflows__when_asked_to_run(), cron, on: true, steps, history }
        }),
      )
    },
  })
}
