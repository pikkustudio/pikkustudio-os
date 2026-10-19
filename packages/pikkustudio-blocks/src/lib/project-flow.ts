import type { UseMutationResult, UseQueryResult } from '@tanstack/react-query'
import { usePikkuMutation, usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import type { ChecklistStepId } from './interview'

export type StepState = 'not-started' | 'working' | 'needs-you' | 'done' | 'skipped'
export type StepAction = 'skip' | 'undo' | 'start' | 'retry' | 'fast-track' | 'reopen'
export type ActivityKind = 'function' | 'table' | 'permissions' | 'screen' | 'mock' | 'test' | 'docs' | 'emails' | 'publish' | 'check'

export type ChecklistStep = {
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

export type Checklist = {
  steps: ChecklistStep[]
  handoff: boolean
  activity: { kind: ActivityKind; name: string; at: number } | null
  withSamples: boolean
  questionsOpen: boolean
  chosenId: string | null
  publishUrl: string | null
  started: boolean
}

export const STEP_ORDER: ChecklistStepId[] = ['questions', 'explore', 'frontend', 'backend', 'tests', 'publish']

export const useProjectChecklist = (key: string) =>
  usePikkuQuery('studio:projectChecklist' as never, { key } as never, { enabled: !!key, refetchInterval: 3000 } as never) as unknown as UseQueryResult<Checklist>

export const useGuideAct = () =>
  usePikkuMutation('studio:projectGuideAct' as never) as unknown as UseMutationResult<Checklist, Error, { key: string; step: ChecklistStepId; action: StepAction; language?: string }>

export const useNoteRun = () =>
  usePikkuMutation('studio:projectNoteRun' as never) as unknown as UseMutationResult<{ key: string }, Error, { key: string; runId: string }>

export const stepOf = (list: Checklist | undefined, id: ChecklistStepId) => list?.steps.find((s) => s.id === id)

export const minutesSince = (at: number | undefined, now: number) => (at ? Math.max(0, Math.round((now - at) / 60000)) : 0)

export const currentStep = (list: Checklist | undefined): ChecklistStep | undefined =>
  list?.steps.find((s) => s.state === 'working') ?? list?.steps.find((s) => s.state === 'needs-you') ?? list?.steps.find((s) => s.state === 'not-started')
