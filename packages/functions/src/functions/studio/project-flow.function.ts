import { z } from 'zod'
import { pikkuSessionlessFunc } from '#pikku/function'
import { slotKey } from '@pikkustudio/builder'
import { EMPTY_INTAKE, allowed, deriveChecklist, guideContext, languageRule, readSignals, type Checklist, type RunState } from '@pikkustudio/addon-studio/services'
import { BACKEND_PROMPT, FLAGS_PROMPT, TESTS_PROMPT, ideaWithAnswers, lastAskedQuestion } from '../../lib/project-flow.js'

const StepId = z.enum(['questions', 'explore', 'frontend', 'backend', 'tests', 'publish'])
const Action = z.enum(['skip', 'undo', 'start', 'retry', 'fast-track', 'reopen'])

export const ChecklistOutput = z.object({
  steps: z.array(
    z.object({
      id: StepId,
      state: z.enum(['not-started', 'working', 'needs-you', 'done', 'skipped']),
      detail: z.string(),
      count: z.number().optional(),
      of: z.number().optional(),
      since: z.number().optional(),
      typical: z.object({ min: z.number(), max: z.number() }).optional(),
      step: z.string().optional(),
      error: z.string().optional(),
      mock: z.boolean().optional(),
      actions: z.array(Action),
    }),
  ),
  handoff: z.boolean(),
  activity: z.object({ kind: z.string(), name: z.string(), at: z.number() }).nullable(),
  withSamples: z.boolean(),
  questionsOpen: z.boolean(),
  chosenId: z.string().nullable(),
  publishUrl: z.string().nullable(),
  started: z.boolean(),
})

type Workflows = { getRun(id: string): Promise<{ error?: { message?: string } } | undefined | null>; getRunStatus(id: string): Promise<{ status: string; steps: { name: string; status: string }[] } | undefined | null> }

const runOf = async (workflows: Workflows | undefined, id: string | undefined): Promise<RunState> => {
  if (!workflows || !id) return null
  const status = await workflows.getRunStatus(id).catch(() => null)
  if (!status) return null
  const run = await workflows.getRun(id).catch(() => null)
  return { status: status.status as NonNullable<RunState>['status'], step: status.steps.find((s) => s.status === 'running')?.name, error: run?.error?.message }
}

type Studio = Parameters<typeof readSignals>[0] & { projects: { list(): Promise<{ key: string; name: string }[]> } }

const view = async (studio: Studio, workflows: Workflows | undefined, key: string): Promise<{ list: Checklist; chosenId: string | null; publishUrl: string | null; started: boolean; idea: string }> => {
  const intake = await studio.projects.intake(key)
  const run = await runOf(workflows, intake?.run?.id)
  const signals = await readSignals(studio, key, run)
  return { list: deriveChecklist(signals), started: intake !== null, chosenId: signals.directions.chosenId ?? null, publishUrl: signals.publish.url ?? null, idea: signals.intake.idea ?? '' }
}

const out = (v: Awaited<ReturnType<typeof view>>) => ({ ...v.list, chosenId: v.chosenId, publishUrl: v.publishUrl, started: v.started })

export const ProjectChecklistInput = z.object({ key: z.string() })

export const projectChecklist = pikkuSessionlessFunc({
  expose: true,
  description: 'The six steps of a project, and where each one stands.',
  input: ProjectChecklistInput,
  output: ChecklistOutput,
  func: async ({ studio, workflowService }, { key }) => out(await view(studio as never, workflowService as never, key)),
})

const startExplore = async (studio: Studio, rpc: { startWorkflow: (name: string, data: unknown) => Promise<{ runId: string }> }, key: string) => {
  const intake = (await studio.projects.intake(key)) ?? EMPTY_INTAKE
  const name = (await studio.projects.list()).find((p) => p.key === key)?.name ?? key
  const { runId } = await rpc.startWorkflow('studio:startProject', {
    name,
    idea: ideaWithAnswers(intake.idea ?? name, intake.answers),
    key,
    surfaces: intake.surfaces.length ? intake.surfaces : ['screens'],
    ...(intake.devices.length ? { devices: intake.devices } : {}),
  })
  await studio.projects.noteRun(key, runId)
  return runId
}

export const ProjectGuideSayInput = z.object({
  key: z.string(),
  message: z.string().optional(),
  kickoff: z.boolean().optional(),
  greet: z.boolean().optional(),
  changed: z.object({ step: StepId, state: z.string() }).optional(),
  skip: z.boolean().optional(),
  language: z.string().optional(),
})

const KICKOFF = '[[kickoff]] I have just created this project. Welcome me in one short sentence, then ask question 1 of 5.'
const GREET = '[[greet]] I have just arrived on the project page. In ONE short line tell me where the project stands and which shortcuts I can use right now; ask no question and add no card.'
const changedText = (step: string, state: string) => `[[changed:${step}:${state}]] The step ${step} has just changed to ${state}. In ONE short line say what changed and what comes next; ask no question and add no card unless a shortcut clearly helps.`
const SKIPPED = '[[skip]] I would rather skip this question.'

export const projectGuideSay = pikkuSessionlessFunc({
  expose: true,
  description: 'Say something to the project guide. It counts the five questions and starts exploring after the fifth.',
  input: ProjectGuideSayInput,
  func: async ({ studio, workflowService }, { key, message, kickoff, greet, changed, skip, language }, { rpc, http }) => {
    const s = studio as never as Studio & { builder: Studio['builder'] }
    const before = await view(s, workflowService as never, key)
    const slot = slotKey(key, 'project')
    let note: string | undefined
    if (before.list.questionsOpen && !kickoff && !greet && !changed && (message?.trim() || skip)) {
      const asked = lastAskedQuestion((await s.builder.state(slot)).items as never)
      if (asked) {
        const count = await s.projects.recordAnswer(key, asked, skip ? '' : message!.trim(), !!skip)
        if (count >= 5) {
          await startExplore(s, rpc as never, key)
          note = 'That was the fifth answer and the questions are finished. Designs are being generated now in the background. Thank them in one short sentence, say the screens are being generated, and do not ask anything else.'
        }
      }
    }
    const after = await view(s, workflowService as never, key)
    const locale = language ?? http?.request?.header('x-studio-locale') ?? undefined
    const spoken = languageRule(locale)
    s.builder.setLocale(key, locale)
    const context = [spoken, guideContext(after.list, Date.now(), note ? [note] : [])].filter(Boolean).join('\n\n')
    const text = kickoff ? KICKOFF : greet ? GREET : changed ? changedText(changed.step, changed.state) : skip && !message?.trim() ? SKIPPED : (message ?? '')
    return s.builder.prompt(key, text, context, 'project')
  },
})

export const ProjectGuideActInput = z.object({ key: z.string(), step: StepId, action: Action, language: z.string().optional() })

export const projectGuideAct = pikkuSessionlessFunc({
  expose: true,
  description: 'Do one of the shortcuts the guide offers: skip a step, undo a skip, start a step, retry, publish with sample information, or go back to the questions.',
  input: ProjectGuideActInput,
  output: ChecklistOutput,
  func: async ({ studio, workflowService }, { key, step, action, language }, { rpc, http }) => {
    const s = studio as never as Studio & { builder: Studio['builder'] }
    const before = await view(s, workflowService as never, key)
    if (!allowed(before.list, step, action)) throw new Error('That is not possible at this point')
    const locale = language ?? http?.request?.header('x-studio-locale') ?? undefined
    const spoken = languageRule(locale)
    s.builder.setLocale(key, locale)
    const build = (text: string, job: 'backend' | 'tests' | 'prep') => s.projects.noteJob(key, job).then(() => s.builder.prompt(key, text, spoken, 'build'))
    if (action === 'reopen' || (action === 'undo' && step === 'questions')) await s.projects.reopenQuestions(key)
    else if (action === 'skip' && step === 'questions') {
      await s.projects.finishIntake(key)
      await s.projects.setSkipped(key, 'questions', true)
      await startExplore(s, rpc as never, key)
    } else if (action === 'skip') await s.projects.setSkipped(key, step, true)
    else if (action === 'undo') await s.projects.setSkipped(key, step, false)
    else if (action === 'start') {
      await s.projects.setSkipped(key, step, false)
      if (step === 'backend') {
        await s.projects.setSamples(key, false)
        await build(BACKEND_PROMPT, 'backend')
      } else if (step === 'tests') await build(TESTS_PROMPT, 'tests')
    } else if (action === 'retry') {
      if (step === 'explore') await startExplore(s, rpc as never, key)
      else if (step === 'frontend') {
        await s.projects.noteJob(key, 'frontend')
        await s.builder.prompt(key, 'Carry on building the frontend from the chosen direction. Finish whatever is missing, and run the checks listed in AGENTS.md before you stop.', spoken, 'frontend')
      }
    } else if (action === 'fast-track') {
      await s.projects.setSamples(key, true)
      await s.projects.setSkipped(key, 'tests', true)
      if (before.list.steps.find((x) => x.id === 'backend')?.count) await build(FLAGS_PROMPT, 'prep')
    }
    return out(await view(s, workflowService as never, key))
  },
})

export const NoteRunInput = z.object({ key: z.string(), runId: z.string() })

export const projectNoteRun = pikkuSessionlessFunc({
  expose: true,
  description: 'Remember which run is exploring a project, so the checklist can follow it.',
  input: NoteRunInput,
  output: z.object({ key: z.string() }),
  func: async ({ studio }, { key, runId }) => {
    await (studio as never as Studio).projects.noteRun(key, runId)
    return { key }
  },
})
