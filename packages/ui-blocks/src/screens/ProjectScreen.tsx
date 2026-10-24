import { m } from '@/i18n/messages'
import { asI18n, type I18nString } from '@pikku/react'
import { ArrowRight, Check, CircleAlert, CircleDashed, Code2, Compass, Database, FlaskConical, HelpCircle, LoaderCircle, Rocket, Undo2 } from 'lucide-react'
import { Navigate } from '@tanstack/react-router'
import { useContext, useEffect, useState } from 'react'
import { Hero } from '../blocks/Hero'
import { Page } from '../blocks/Page'
import { Dot, RowCard, RowStack } from '../blocks/RowCard'
import { CardsSkeleton, QueryState } from '../blocks/QueryState'
import { Link } from '../blocks/Link'
import { Button } from '../ui/button'
import type { ChecklistStepId } from '../lib/interview'
import { keep } from '../lib/links'
import { useProjectKey } from '../lib/project'
import { minutesSince, useGuideAct, useProjectChecklist, type Checklist, type ChecklistStep, type StepAction } from '../lib/project-flow'
import { ShellCtx } from '../lib/shell'
import { labels } from './NewProjectScreen'

const ICON: Record<ChecklistStepId, typeof Check> = { questions: HelpCircle, explore: Compass, frontend: Code2, backend: Database, tests: FlaskConical, publish: Rocket }

const NAME: Record<ChecklistStepId, () => I18nString> = {
  questions: m.project_flow__step_questions,
  explore: m.project_flow__step_explore,
  frontend: m.project_flow__step_frontend,
  backend: m.project_flow__step_backend,
  tests: m.project_flow__step_tests,
  publish: m.project_flow__step_publish,
}

const STATE: Record<ChecklistStep['state'], () => I18nString> = {
  'not-started': m.project_flow__state_not_started,
  working: m.project_flow__state_working,
  'needs-you': m.project_flow__state_needs_you,
  done: m.project_flow__state_done,
  skipped: m.project_flow__state_skipped,
}

const caption = (s: ChecklistStep): I18nString => {
  const count = String(s.count ?? 0)
  switch (`${s.id}:${s.detail}`) {
    case 'questions:asking': return m.project_flow__cap_questions_asking({ count })
    case 'questions:done': return m.project_flow__cap_questions_done()
    case 'questions:design-first': return m.project_flow__cap_questions_design_first()
    case 'questions:skipped': return m.project_flow__cap_questions_skipped()
    case 'explore:waiting': return m.project_flow__cap_explore_waiting()
    case 'explore:preparing': return m.project_flow__cap_explore_preparing()
    case 'explore:making': return m.project_flow__cap_explore_making({ count })
    case 'explore:pick': return m.project_flow__cap_explore_pick()
    case 'explore:done': return m.project_flow__cap_explore_done()
    case 'explore:failed': return m.project_flow__cap_explore_failed()
    case 'explore:empty': return m.project_flow__cap_explore_empty()
    case 'explore:idle': return m.project_flow__cap_explore_idle()
    case 'frontend:waiting': return m.project_flow__cap_frontend_waiting()
    case 'frontend:building': return m.project_flow__cap_frontend_building()
    case 'frontend:ready': return m.project_flow__cap_frontend_ready()
    case 'frontend:stalled': return m.project_flow__cap_frontend_stalled()
    case 'backend:waiting': return m.project_flow__cap_backend_waiting()
    case 'backend:offer': return m.project_flow__cap_backend_offer()
    case 'backend:still-sample': return m.project_flow__cap_backend_still_sample()
    case 'backend:building': return m.project_flow__cap_backend_building()
    case 'backend:ready': return m.project_flow__cap_backend_ready()
    case 'backend:skipped': return m.project_flow__cap_backend_skipped()
    case 'backend:nothing': return m.project_flow__cap_backend_nothing()
    case 'tests:waiting': return m.project_flow__cap_tests_waiting()
    case 'tests:offer': return m.project_flow__cap_tests_offer()
    case 'tests:building': return m.project_flow__cap_tests_building()
    case 'tests:ready': return m.project_flow__cap_tests_ready()
    case 'tests:skipped': return m.project_flow__cap_tests_skipped()
    case 'publish:waiting': return m.project_flow__cap_publish_waiting()
    case 'publish:ready': return m.project_flow__cap_publish_ready()
    case 'publish:ready-samples': return m.project_flow__cap_publish_ready_samples()
    case 'publish:preparing': return m.project_flow__cap_publish_preparing()
    case 'publish:publishing': return m.project_flow__cap_publish_publishing()
    case 'publish:live': return m.project_flow__cap_publish_live()
    case 'publish:live-samples': return m.project_flow__cap_publish_live_samples()
    case 'publish:failed': return m.project_flow__cap_publish_failed()
    default: return NAME[s.id]()
  }
}

const label = (id: ChecklistStepId, action: StepAction): I18nString => {
  if (action === 'skip') return id === 'questions' ? m.project_flow__act_skip_questions() : id === 'backend' ? m.project_flow__act_skip_backend() : m.project_flow__act_skip_tests()
  if (action === 'undo') return id === 'questions' ? m.project_flow__act_undo_questions() : m.project_flow__act_undo()
  if (action === 'start') return id === 'backend' ? m.project_flow__act_start_backend() : m.project_flow__act_start_tests()
  if (action === 'retry') return m.project_flow__act_retry()
  if (action === 'fast-track') return m.project_flow__act_fast_track()
  return m.project_flow__act_reopen()
}

const heroWhy = (list: Checklist): I18nString => {
  const by = Object.fromEntries(list.steps.map((s) => [s.id, s])) as Record<ChecklistStepId, ChecklistStep>
  if (by.publish.state === 'done') return by.publish.mock ? m.project_flow__hero_why_live_samples() : m.project_flow__hero_why_live()
  if (by.explore.state === 'needs-you' && by.explore.error) return m.project_flow__hero_why_failed()
  if (by.questions.state === 'needs-you') return m.project_flow__hero_why_questions()
  if (by.explore.state === 'working' || by.explore.state === 'not-started') return by.questions.detail === 'design-first' ? m.project_flow__hero_why_design_first() : m.project_flow__hero_why_exploring()
  if (by.explore.state === 'needs-you') return m.project_flow__hero_why_pick()
  if (by.frontend.state === 'working' || by.frontend.state === 'needs-you') return m.project_flow__hero_why_building()
  return m.project_flow__hero_why_next()
}

function useNow(every: number) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), every)
    return () => clearInterval(id)
  }, [every])
  return now
}

function Wait({ step, now }: { step: ChecklistStep; now: number }) {
  const mins = minutesSince(step.since, now)
  const typical = step.typical
  const pace = !typical
    ? null
    : !step.since || mins < 1
      ? m.project_flow__wait_just_started({ min: String(typical.min), max: String(typical.max) })
      : mins > typical.max
        ? m.project_flow__wait_over({ minutes: String(mins) })
        : m.project_flow__wait_elapsed({ minutes: String(mins), min: String(typical.min), max: String(typical.max) })
  const doing = step.id === 'explore' && step.step ? labels()[step.step] : null
  if (!pace && !doing) return null
  return (
    <p className="flex items-center gap-2 text-[14px] text-ink-2" data-testid={`project-wait-${step.id}`}>
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
      {[doing, pace].filter(Boolean).map((t, i) => (
        <span key={i}>{t}</span>
      ))}
    </p>
  )
}

function StepRow({ step, now, busy, onAct, ask }: { step: ChecklistStep; now: number; busy: boolean; onAct: (id: ChecklistStepId, a: StepAction) => void; ask: (text: I18nString) => void }) {
  const Icon = step.state === 'done' ? Check : step.state === 'working' ? LoaderCircle : step.state === 'needs-you' ? CircleAlert : step.state === 'skipped' ? Undo2 : ICON[step.id] ?? CircleDashed
  const failed = step.state === 'needs-you' && !!step.error
  const tone = failed ? 'bad' : step.state === 'needs-you' ? 'warn' : step.state === 'done' || step.state === 'working' ? 'ok' : 'quiet'
  const primary = step.actions.find((a) => a === 'start' || a === 'retry' || a === 'fast-track' || a === 'reopen')
  return (
    <div data-testid={`project-step-${step.id}`} data-state={step.state}>
      <RowCard
        tile={<Icon className={`size-5 ${step.state === 'working' ? 'animate-spin' : ''}`} />}
        on={step.state === 'done' || step.state === 'working'}
        flag={step.state === 'needs-you'}
        title={NAME[step.id]()}
        caption={caption(step)}
        below={
          <>
            {step.state === 'working' ? <Wait step={step} now={now} /> : null}
            {failed ? (
              <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg bg-secondary px-3.5 py-3 text-[14px] text-ink-2" data-testid={`project-error-${step.id}`}>
                <span className="min-w-0 flex-1 basis-60">{m.project_flow__error_explain()}</span>
                <Button variant="bordered" size="chip" type="button" onClick={() => ask(m.project_flow__error_ask())} data-testid={`project-error-help-${step.id}`}>
                  {m.project_flow__error_help()}
                </Button>
              </div>
            ) : null}
          </>
        }
      >
        {step.mock ? (
          <span className="rounded-full bg-secondary px-3 py-1 text-[13px] font-semibold text-ink-2" data-testid={`project-sample-${step.id}`}>
            {m.project_flow__chip_sample()}
          </span>
        ) : null}
        <Dot tone={tone}>{failed ? m.project_flow__state_problem() : STATE[step.state]()}</Dot>
        {step.actions.map((a) => (
          <Button key={a} variant={a === primary ? 'default' : 'bordered'} size="compact" type="button" disabled={busy} onClick={() => onAct(step.id, a)} data-testid={`project-action-${step.id}-${a}`}>
            {label(step.id, a)}
          </Button>
        ))}
      </RowCard>
    </div>
  )
}

function Steps({ list, projectKey, refetch }: { list: Checklist; projectKey: string; refetch: () => unknown }) {
  const act = useGuideAct()
  const { say } = useContext(ShellCtx)
  const now = useNow(15000)
  const onAct = (step: ChecklistStepId, action: StepAction) => act.mutate({ key: projectKey, step, action }, { onSuccess: () => void refetch() })
  const publish = list.steps.find((s) => s.id === 'publish')
  return (
    <Page gap="tight">
      <Hero
        hue="teal"
        page="project"
        title={m.project_flow__hero_title()}
        why={heroWhy(list)}
        actions={
          list.handoff ? (
            <Link {...keep} to="/design" data-testid="project-open-design">
              <Button variant="hero" size="hero" type="button" tabIndex={-1}>
                {m.project_flow__open_design()}
                <ArrowRight className="rtl:-scale-x-100" />
              </Button>
            </Link>
          ) : undefined
        }
        hint={list.withSamples ? m.project_flow__hint_samples() : undefined}
      />
      {act.isError ? (
        <div role="alert" className="flex flex-wrap items-center gap-3 rounded-card border-[1.5px] border-destructive bg-card px-5 py-4 text-[15px]" data-testid="project-act-error">
          <CircleAlert className="size-5 text-destructive-foreground" />
          <span className="min-w-0 flex-1 basis-60">{m.project_flow__act_error()}</span>
          <Button variant="bordered" size="chip" type="button" onClick={() => say(m.project_flow__error_ask())}>
            {m.project_flow__error_help()}
          </Button>
        </div>
      ) : null}
      <RowStack>
        {list.steps.map((s) => (
          <StepRow key={s.id} step={s} now={now} busy={act.isPending} onAct={onAct} ask={say} />
        ))}
      </RowStack>
      {publish?.state === 'done' && list.publishUrl ? (
        <a className="text-[15px] font-semibold text-accent-foreground underline" href={list.publishUrl} target="_blank" rel="noreferrer" data-testid="project-live-link">
          {asI18n(list.publishUrl)}
        </a>
      ) : null}
    </Page>
  )
}

export function ProjectScreen() {
  const key = useProjectKey()
  const query = useProjectChecklist(key)
  return (
    <QueryState query={query} skeleton={<CardsSkeleton count={3} />}>
      {(list) => !list.started ? <Navigate {...keep} to="/home" replace /> : <Steps list={list} projectKey={key} refetch={query.refetch} />}
    </QueryState>
  )
}
