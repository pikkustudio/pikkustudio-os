import { QUESTIONS, type ChecklistStepId, type Intake } from '../services/projects.js'

export type StepState = 'not-started' | 'working' | 'needs-you' | 'done' | 'skipped'

export type StepAction = 'skip' | 'undo' | 'start' | 'retry' | 'fast-track' | 'reopen'

export type RunState = { status: 'running' | 'suspended' | 'completed' | 'failed' | 'cancelled'; step?: string; error?: string } | null

export type ActivityKind = 'function' | 'table' | 'permissions' | 'screen' | 'mock' | 'test' | 'docs' | 'emails' | 'publish' | 'check' | 'knowledge'

export type Activity = { kind: ActivityKind; name: string; at: number }

export interface Signals {
  intake: Intake
  directions: { total: number; chosen: boolean; chosenId?: string }
  designed: boolean
  samples: number
  busy: { frontend: boolean; build: boolean }
  publish: { state: 'idle' | 'running' | 'done' | 'failed'; url?: string }
  run: RunState
  activity: Activity | null
  now: number
}

export interface ChecklistStep {
  id: ChecklistStepId
  state: StepState
  detail: string
  count?: number
  of?: number
  since?: number
  typical?: { min: number; max: number }
  step?: string
  error?: string
  mock?: boolean
  actions: StepAction[]
}

export interface Checklist {
  steps: ChecklistStep[]
  handoff: boolean
  activity: Activity | null
  withSamples: boolean
  questionsOpen: boolean
}

export const DIRECTIONS = 4
export const BUILD_MINUTES = { min: 10, max: 14 }
export const STEP_IDS: ChecklistStepId[] = ['questions', 'explore', 'frontend', 'backend', 'tests', 'publish']

const finished = (state: StepState) => state === 'done' || state === 'skipped'

const words = (text: string) =>
  text
    .replace(/\.(tsx?|jsx?|sql|json|mdx?)$/, '')
    .replace(/\.(function|scenario|step|test|workflow|permissions?)$/, '')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_.]+/g, ' ')
    .replace(/^\d+\s*/, '')
    .replace(/^(create|add|alter|app)\s+/i, '')
    .trim()
    .toLowerCase()

const base = (path: string) => path.split('/').pop() ?? path

export function classifyActivity(summary: string): { kind: ActivityKind; name: string } | null {
  const text = summary.trim()
  if (!text) return null
  const path = text.replace(/^\.\//, '')
  if (/(^|\/)knowledge\//.test(path)) return { kind: 'knowledge', name: '' }
  if (/(^|\/)\.mocks\/([^/]+)/.test(path)) return { kind: 'mock', name: words((/\.mocks\/([^/]+)/.exec(path)?.[1] ?? '').split(/[.:]/)[0]) }
  if (/(^|\/)migrations?\//.test(path)) return { kind: 'table', name: words(base(path).replace(/\.(sql|ts|js)$/, '')) }
  if (/permission/i.test(path)) return { kind: 'permissions', name: '' }
  if (/\.(scenario|step|test)\.ts$/.test(path) || /(^|\/)test\//.test(path)) return { kind: 'test', name: words(base(path).replace(/\.ts$/, '')) }
  if (/(^|\/)(guide|docs)\//.test(path) || /\.mdx?$/.test(path)) return { kind: 'docs', name: words(base(path).replace(/\.mdx?$/, '')) }
  if (/(^|\/)emails\//.test(path)) return { kind: 'emails', name: words(base(path).replace(/\.[a-z]+$/, '')) }
  if (/\.function\.ts$/.test(path)) return { kind: 'function', name: words(base(path)) }
  if (/(^|\/)(routes|pages|screens)\/.+\.tsx$/.test(path)) return { kind: 'screen', name: words(base(path).replace(/\.tsx$/, '').replace(/\.index$/, '')) }
  if (/\b(deploy|publish)\b/.test(text)) return { kind: 'publish', name: '' }
  if (/\b(pikku all|tsc|bun test|lint|bun run test)\b/.test(text)) return { kind: 'check', name: '' }
  return null
}

export function latestActivity(tools: { summary: string; at: number }[]): Activity | null {
  for (let i = tools.length - 1; i >= 0; i--) {
    const found = classifyActivity(tools[i].summary)
    if (found && found.kind !== 'knowledge') return { ...found, at: tools[i].at }
  }
  return null
}

export function deriveChecklist(s: Signals): Checklist {
  const { intake, run } = s
  const runActive = run?.status === 'running' || run?.status === 'suspended'
  const runFailed = run?.status === 'failed' || run?.status === 'cancelled'
  const designFirst = intake.path === 'design' || intake.skipped.includes('questions')

  const questions: ChecklistStep = (() => {
    const base = { id: 'questions' as const, of: QUESTIONS, count: intake.answers.length }
    if (designFirst && intake.answers.length < QUESTIONS) return { ...base, state: 'skipped', detail: intake.path === 'design' ? 'design-first' : 'skipped', actions: ['undo'] }
    if (intake.done || intake.answers.length >= QUESTIONS || intake.path === null) return { ...base, state: 'done', detail: 'done', actions: ['reopen'] }
    return { ...base, state: 'needs-you', detail: 'asking', actions: ['skip'] }
  })()

  const beforeExplore = !finished(questions.state)
  const explore: ChecklistStep = (() => {
    const base = { id: 'explore' as const, count: s.directions.total, of: DIRECTIONS }
    if (beforeExplore) return { ...base, state: 'not-started', detail: 'waiting', actions: [] }
    if (s.directions.chosen) return { ...base, state: 'done', detail: 'done', actions: [] }
    if (runActive) return { ...base, state: 'working', detail: s.directions.total ? 'making' : 'preparing', since: intake.run?.at, step: run?.step, actions: [] }
    if (runFailed) return { ...base, state: 'needs-you', detail: 'failed', error: run?.error, actions: ['retry'] }
    if (s.directions.total > 0) return { ...base, state: 'needs-you', detail: 'pick', actions: [] }
    return { ...base, state: 'needs-you', detail: run ? 'empty' : 'idle', actions: ['retry'] }
  })()

  const frontend: ChecklistStep = (() => {
    const base = { id: 'frontend' as const }
    if (explore.state !== 'done') return { ...base, state: 'not-started', detail: 'waiting', actions: [] }
    if (s.busy.frontend) return { ...base, state: 'working', detail: 'building', since: intake.jobs.frontend, typical: BUILD_MINUTES, actions: [] }
    if (s.designed) return { ...base, state: 'done', detail: 'ready', actions: [] }
    return { ...base, state: 'needs-you', detail: 'stalled', actions: ['retry'] }
  })()

  const latest = (['backend', 'tests', 'prep'] as const)
    .filter((j) => intake.jobs[j])
    .sort((a, b) => (intake.jobs[b] ?? 0) - (intake.jobs[a] ?? 0))[0]
  const jobStep = (job: 'backend' | 'tests', skipped: boolean, offer: ChecklistStep['detail'], ready: boolean): ChecklistStep => {
    const id = job
    if (!ready) return { id, state: 'not-started', detail: 'waiting', actions: [] }
    const at = intake.jobs[job]
    if (at && latest === job && s.busy.build) return { id, state: 'working', detail: 'building', since: at, typical: BUILD_MINUTES, actions: [] }
    if (at) return { id, state: 'done', detail: 'ready', actions: [] }
    if (skipped) return { id, state: 'skipped', detail: 'skipped', actions: ['undo'] }
    return { id, state: 'needs-you', detail: offer, actions: ['start', 'skip'] }
  }

  const backendReady = frontend.state === 'done'
  const backendBase = jobStep('backend', intake.skipped.includes('backend'), s.samples > 0 ? (intake.samples ? 'still-sample' : 'offer') : 'nothing', backendReady)
  const backend: ChecklistStep =
    backendReady && backendBase.state === 'needs-you' && backendBase.detail === 'nothing'
      ? { id: 'backend', state: 'done', detail: 'nothing', actions: [] }
      : { ...backendBase, ...(backendReady ? { count: s.samples } : {}), ...(backendBase.state === 'skipped' || (backendBase.state === 'needs-you' && intake.samples) ? { mock: true } : {}) }

  const tests = jobStep('tests', intake.skipped.includes('tests'), 'offer', backend.state !== 'not-started' && (finished(backend.state) || intake.samples))

  const prepping = latest === 'prep' && s.busy.build
  const live = s.publish.state === 'done'
  const mockLeft = backend.state !== 'done'
  const publish: ChecklistStep = (() => {
    const base = { id: 'publish' as const }
    if (live) return { ...base, state: 'done', detail: mockLeft ? 'live-samples' : 'live', mock: mockLeft, actions: [] }
    if (frontend.state !== 'done') return { ...base, state: 'not-started', detail: 'waiting', actions: [] }
    if (s.publish.state === 'running') return { ...base, state: 'working', detail: 'publishing', actions: [] }
    if (prepping) return { ...base, state: 'working', detail: 'preparing', since: intake.jobs.prep, actions: [] }
    const open = (finished(backend.state) || intake.samples) && finished(tests.state)
    if (s.publish.state === 'failed') return { ...base, state: 'needs-you', detail: 'failed', actions: [] }
    if (open) return { ...base, state: 'needs-you', detail: mockLeft ? 'ready-samples' : 'ready', mock: mockLeft, actions: [] }
    return { ...base, state: 'not-started', detail: 'waiting', actions: intake.samples ? [] : ['fast-track'] }
  })()

  return {
    steps: [questions, explore, frontend, backend, tests, publish],
    handoff: frontend.state === 'working' || frontend.state === 'done',
    activity: s.activity,
    withSamples: mockLeft && (intake.samples || live),
    questionsOpen: questions.state === 'needs-you',
  }
}

export const allowed = (list: Checklist, step: ChecklistStepId, action: StepAction): boolean =>
  !!list.steps.find((s) => s.id === step)?.actions.includes(action)

const NAME: Record<ChecklistStepId, string> = {
  questions: 'Five questions',
  explore: 'Explore direction',
  frontend: 'Build the frontend',
  backend: 'Build the backend',
  tests: 'Tests and docs',
  publish: 'Publish',
}

const minutes = (since: number | undefined, now: number) => (since ? Math.max(0, Math.round((now - since) / 60000)) : undefined)

export function guideContext(list: Checklist, now: number, extra: string[] = []): string {
  const lines = list.steps.map((s, i) => {
    const bits = [`${i + 1}. ${NAME[s.id]}: ${s.state} (${s.detail})`]
    if (s.id === 'questions') bits.push(`${s.count} of ${s.of} answered`)
    if (s.id === 'explore' && s.of) bits.push(`${s.count} of ${s.of} directions ready`)
    const mins = minutes(s.since, now)
    if (s.state === 'working' && mins !== undefined) bits.push(`running for about ${mins} minutes`)
    if (s.typical && s.state === 'working') bits.push(`builds usually take ${s.typical.min} to ${s.typical.max} minutes`)
    if (s.step) bits.push(`doing: ${s.step}`)
    if (s.error) bits.push(`problem: ${s.error.slice(0, 200)}`)
    if (s.mock) bits.push('still shows sample information')
    bits.push(`available shortcuts: ${s.actions.length ? s.actions.join(', ') : 'none'}`)
    return bits.join('; ')
  })
  const head = list.questionsOpen
    ? `Step 1 is open. Ask exactly question ${list.steps[0].count! + 1} of ${QUESTIONS}, as one ask card, and nothing after it.`
    : 'The five questions are finished. Never ask a question card now.'
  return ['Live state of the project (the person cannot see this block):', ...lines, head, list.handoff ? 'The design agent is now building the screens in the same chat thread; the person may talk to either of you.' : '', ...extra].filter(Boolean).join('\n')
}
