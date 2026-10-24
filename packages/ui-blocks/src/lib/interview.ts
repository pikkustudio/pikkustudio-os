export type ChecklistStepId = 'questions' | 'explore' | 'frontend' | 'backend' | 'tests' | 'publish'

export type Intake = {
  path: 'interview' | 'design' | null
  done: boolean
  idea: string | null
  surfaces: string[]
  devices: string[]
  answers: { question: string; answer: string; skipped: boolean }[]
  skipped: ChecklistStepId[]
  run: { id: string; at: number } | null
  jobs: Partial<Record<'frontend' | 'backend' | 'tests' | 'prep', number>>
  samples: boolean
}
