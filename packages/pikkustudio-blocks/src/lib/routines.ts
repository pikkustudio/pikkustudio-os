import { useContext } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ProjectRpcCtx } from './projectRpc'

// Same shape the real workflow graph reads (steps with a flow or rpc name), written in the person's own words.
export type StepKind = 'when' | 'do' | 'ask' | 'wait' | 'end'
export type StepState = 'done' | 'failed' | 'skipped' | 'waiting' | 'running'
export type Step = { id: string; kind: StepKind; title: string; says: string; by?: string; ifNot?: string }
export type StepNote = { in?: string; out?: string; error?: string; code?: string; tries?: number }
export type Run = { id: string; when: string; took: string; ok: boolean; note: string; steps: Record<string, StepState>; why?: string; notes?: Record<string, StepNote>; older?: Step[] }
/** One thing that happened in a run, in order. `at` is milliseconds since it began. */
export type Ev = { seq: number; step: string; type: 'started' | 'retried' | 'done' | 'failed'; at: number }
export type Routine = { id: string; name: string; what: string; runs: string; on: boolean; steps: Step[]; history: Run[] }

const runWord: Record<StepState, string> = { done: 'completed', failed: 'failed', skipped: 'cancelled', waiting: 'pending', running: 'running' }

export function toMeta(r: Routine, steps: Step[] = r.steps) {
  const nodes: Record<string, any> = {}
  const [when, ...rest] = steps
  rest.forEach((s, i) => {
    const next = rest[i + 1]?.id
    if (s.kind === 'end') nodes[s.id] = { flow: 'return', stepName: s.title, description: s.says }
    else if (s.kind === 'wait') nodes[s.id] = { flow: 'sleep', stepName: s.title, description: s.says, duration: 'a quiet moment', next }
    else if (s.kind === 'ask') {
      nodes[s.id] = { flow: 'branch', stepName: s.title, condition: { expression: 'Yes' }, thenEntry: next, elseEntry: `${s.id}-no` }
      nodes[`${s.id}-no`] = { flow: 'return', stepName: s.ifNot ?? 'Stops here' }
    } else nodes[s.id] = { rpcName: s.by ?? 'Your app', stepName: s.title, description: s.says, next }
  })
  const start = rest[0].id
  const timed = r.runs.startsWith('Every')
  return { name: r.name, steps: [], nodes, entryNodeIds: [start], wires: timed ? { schedule: [{ cron: r.runs.replace(/^Every /, ''), startNode: start }] } : { trigger: [{ name: when.title, startNode: start }] } }
}

/** A run as the graph reads it: the state of every step, and what started it. */
export function toRun(r: Routine, run: Run, states: Record<string, StepState>, running = false) {
  const timed = r.runs.startsWith('Every')
  return {
    runId: run.id,
    status: running ? 'running' : run.ok ? 'completed' : 'failed',
    wire: timed ? { type: 'scheduler', id: r.runs } : { type: 'trigger' },
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
type WorkflowMeta = { nodes?: Record<string, Node>; entryNodeIds?: string[]; wires?: { schedule?: { cron: string }[]; trigger?: { name: string }[] } }
type RealStep = { stepId: string; status: string; result?: unknown; error?: { message?: string }; attemptCount?: number }
type RealRun = { id: string; status: string; error?: { message?: string }; createdAt: string; updatedAt: string }

const nice = (id: string) => id.replace(/[-_.]/g, ' ').replace(/^./, (c) => c.toUpperCase())
const stateOf: Record<string, StepState> = { succeeded: 'done', failed: 'failed', running: 'running', scheduled: 'running', suspended: 'waiting', pending: 'waiting' }
const show = (v: unknown) => (v === undefined ? undefined : typeof v === 'string' ? v : JSON.stringify(v))

const stepsOf = (id: string, m: WorkflowMeta): Step[] => {
  const nodes = m.nodes ?? {}
  const cron = m.wires?.schedule?.[0]?.cron
  const out: Step[] = [{ id: 'when', kind: 'when', title: cron ? `On a schedule: ${cron}` : (m.wires?.trigger?.[0]?.name ?? 'When it is asked to run'), says: 'This is what starts it.' }]
  const seen = new Set<string>()
  let cur: string | undefined = m.entryNodeIds?.[0]
  while (cur && !seen.has(cur) && nodes[cur]) {
    seen.add(cur)
    const n: Node = nodes[cur]
    const title = n.stepName ?? nice(cur)
    if (n.flow === 'return') out.push({ id: cur, kind: 'end', title, says: n.description ?? '' })
    else if (n.flow === 'sleep') out.push({ id: cur, kind: 'wait', title, says: n.description ?? '' })
    else if (n.flow === 'branch') out.push({ id: cur, kind: 'ask', title, says: n.description ?? '', ifNot: n.elseEntry ? nodes[n.elseEntry]?.stepName : undefined })
    else out.push({ id: cur, kind: 'do', title, says: n.description ?? '', by: n.rpcName ? nice(n.rpcName.replace(/^.*:/, '')) : undefined })
    cur = n.flow === 'branch' ? n.thenEntry : n.next
  }
  return out
}

const dayOf = (iso: string) => new Date(iso).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

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
    took: `${secs} seconds`,
    ok: r.status === 'completed',
    note: failed ? `Went wrong at ${failed.title}` : r.status === 'completed' ? 'Ran fine' : nice(r.status),
    steps: states,
    why: r.error?.message ?? (failed ? notes[failed.id]?.error : undefined),
    notes,
  }
}

export const useRoutines = (key: string) => {
  const invoke = useContext(ProjectRpcCtx)
  return useQuery<Routine[]>({
    enabled: !!key,
    queryKey: ['project', key, 'routines'],
    refetchInterval: 8000,
    retry: false,
    queryFn: async () => {
      const meta = (await invoke(key, 'console:getAllMeta', {})) as { workflows?: Record<string, WorkflowMeta> }
      return Promise.all(
        Object.entries(meta.workflows ?? {}).map(async ([id, m]) => {
          const steps = stepsOf(id, m)
          const runs = ((await invoke(key, 'console:getWorkflowRuns', { workflowName: id, limit: 8 })) as RealRun[] | null) ?? []
          const history = await Promise.all(runs.map(async (r) => runOf(r, steps, ((await invoke(key, 'console:getWorkflowRunSteps', { runId: r.id })) as RealStep[] | null) ?? [])))
          const cron = m.wires?.schedule?.[0]?.cron
          return { id, name: nice(id), what: steps.find((s) => s.kind === 'do')?.says ?? '', runs: cron ? `Every ${cron}` : 'When asked to run', on: true, steps, history }
        }),
      )
    },
  })
}
