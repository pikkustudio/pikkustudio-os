import { asI18n, type I18nNode, type I18nString } from '@pikku/react'
import { useContext, useState } from 'react'
import { Check, ChevronDown, Cloud, Copy, Laptop, LoaderCircle, Play, RefreshCw } from 'lucide-react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { useProjectKey } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { Button } from '../ui/button'
import { MachineOpening, OpeningStage, openingH1, openingLead, type OpeningStep } from './MachineOpening'
import { PikkuDot } from './PikkuDot'
import { StateScreen } from './StateScreen'

export type AppNotRunningState = 'off' | 'starting' | 'failed'

export type LaunchWhere = 'cloud' | 'local'
export type StageWayOut = { name: string; onPublish: () => void; onWorkspace: () => void; outdated?: boolean }
export type LaunchChoices = { primary: LaunchWhere; onPick: (where: LaunchWhere) => void; cloudOff?: boolean }

export type LaunchPhase = 'machine' | 'studio' | 'sync' | 'project' | 'connect'

export const CLOUD_LAUNCH: LaunchPhase[] = ['machine', 'studio', 'sync', 'project', 'connect']
export const LOCAL_LAUNCH: LaunchPhase[] = ['sync', 'project', 'connect']

export const phaseLabel = (phase: LaunchPhase) =>
  ({
    machine: m.project_launch__step_machine,
    studio: m.project_launch__step_studio,
    sync: m.project_launch__step_sync,
    project: m.project_launch__step_project,
    connect: m.project_launch__step_connect,
  })[phase]()

export function launchSteps(phases: LaunchPhase[], now: LaunchPhase): OpeningStep[] {
  const at = phases.indexOf(now)
  return phases.map((phase, i) => ({ label: phaseLabel(phase), state: i < at ? 'done' : i === at ? 'now' : 'wait' }))
}

const reasonOf = (log: string) =>
  !log.trim()
    ? m.app_not_running__reason_none()
    : /Operation not permitted|EPERM/.test(log)
      ? m.app_not_running__reason_fence()
      : /EADDRINUSE|address already in use/i.test(log)
        ? m.app_not_running__reason_port()
        : /ENOENT|command not found|not found/i.test(log)
          ? m.app_not_running__reason_missing()
          : m.app_not_running__reason_generic()

type LogSources = { sources: { id: string; lines: string[] }[] }

function useFailureLog(enabled: boolean, error: unknown) {
  const key = useProjectKey()
  const logs = usePikkuQuery('studio:projectLogs', { key }, { enabled: enabled && !!key } as never)
  const fromError = error instanceof Error ? error.message : ''
  const fromLogs = ((logs.data as LogSources | undefined)?.sources ?? [])
    .map((s) => s.lines.slice(-15).join('\n'))
    .filter(Boolean)
    .join('\n')
  return (fromLogs || fromError).split('\n').slice(-30).join('\n').trim()
}

function AppStage({ label, children }: { label: I18nString; children: I18nNode }) {
  return (
    <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
      <OpeningStage label={label}>{children}</OpeningStage>
    </div>
  )
}

export function AppNotRunning({
  state,
  name,
  what,
  onStart,
  starting = false,
  steps,
  error,
  reason,
  logText,
  fixSay,
  choices,
  stage,
}: {
  state: AppNotRunningState
  name?: string
  what?: I18nString
  onStart: () => void
  starting?: boolean
  steps?: OpeningStep[]
  error?: unknown
  reason?: I18nString
  logText?: string
  fixSay?: (log: string) => I18nString
  choices?: LaunchChoices
  stage?: StageWayOut
}) {
  const { say } = useContext(ShellCtx)
  const [explain, setExplain] = useState(false)
  const [copied, setCopied] = useState(false)
  const fetched = useFailureLog(state === 'failed' && logText === undefined, error)
  const log = logText ?? fetched
  const who = name ?? m.app_not_running__your_app()
  const thing = what ?? m.app_not_running__what_default()
  const busy = state === 'starting' || starting

  const title =
    state === 'failed' ? m.app_not_running__failed_title({ name: who }) : busy ? m.app_not_running__starting_title({ name: who }) : m.app_not_running__off_title({ name: who })
  const text =
    state === 'failed'
      ? (reason ?? reasonOf(log))
      : busy
          ? m.app_not_running__starting_text({ what: thing })
          : m.app_not_running__off_text({ what: thing })

  if (state === 'starting' && steps) {
    return (
      <AppStage label={m.project_launch__opening_title()}>
        <MachineOpening title={m.project_launch__opening_title()} lead={m.project_launch__opening_lead()} steps={steps} />
      </AppStage>
    )
  }

  if (state === 'failed') {
    return (
      <AppStage label={title}>
        <div>
          <h1 className={openingH1}>{title}</h1>
          <p className={openingLead}>{text}</p>
        </div>
        <div className="flex flex-col gap-5">
          <div role="status" aria-live="polite" className="sr-only">{title}</div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Button variant="hero" size="page" type="button" disabled={busy} aria-busy={busy} onClick={onStart}>
              {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-5" aria-hidden="true" />}
              {busy ? m.app_not_running__starting_button() : m.app_not_running__try_again()}
            </Button>
            <button type="button" aria-expanded={explain} onClick={() => setExplain((v) => !v)} className="inline-flex items-center gap-1.5 text-px15 font-semibold text-hero-ink underline-offset-2 hover:underline">
              <ChevronDown className={`size-4 transition-transform ${explain ? 'rotate-180' : ''}`} aria-hidden="true" />
              {explain ? m.app_not_running__hide() : m.app_not_running__what_happened()}
            </button>
            <Button variant="heroGhost" size="page" type="button" onClick={() => say(fixSay ? fixSay(log) : m.app_not_running__fix_say({ name: who, log: asI18n(log) }))}>
              <PikkuDot />
              {m.app_not_running__ask_fix()}
            </Button>
          </div>
          {explain ? (
            <div className="rounded-xl bg-secondary p-4 text-start text-foreground">
              <b className="mb-1.5 block text-px15">{m.app_not_running__details_title()}</b>
              <pre dir="ltr" className="m-0 max-h-40 overflow-auto font-mono text-px13 whitespace-pre-wrap text-ink-2" data-testid="app-start-log">{asI18n(log || m.app_not_running__reason_none())}</pre>
              <Button
                variant="bordered"
                size="compact"
                type="button"
                className="mt-3"
                onClick={() => void navigator.clipboard?.writeText(log).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? m.app_not_running__copied() : m.app_not_running__copy_details()}
              </Button>
            </div>
          ) : null}
        </div>
      </AppStage>
    )
  }

  if (stage) {
    const name = asI18n(stage.name)
    const title = stage.outdated ? m.project_launch__stage_outdated_title({ name }) : m.project_launch__stage_title({ name })
    const why = stage.outdated ? m.project_launch__stage_outdated_why({ name }) : m.project_launch__stage_why({ name })
    return (
      <StateScreen label={title} hue="teal" page="resume" title={title} why={why}>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3" data-testid="stage-not-live">
          <Button variant="hero" size="page" type="button" onClick={stage.onPublish}>
            {stage.outdated ? m.project_launch__stage_publish_again() : m.project_launch__stage_publish()}
          </Button>
          <Button variant="heroGhost" size="page" type="button" onClick={stage.onWorkspace}>
            {m.project_launch__stage_workspace()}
          </Button>
        </div>
      </StateScreen>
    )
  }

  if (choices) {
    const order: LaunchWhere[] = choices.primary === 'cloud' ? ['cloud', 'local'] : ['local', 'cloud']
    const title = m.project_launch__title()
    return (
      <StateScreen label={title} hue="teal" page="resume" title={title} why={choices.cloudOff ? m.project_launch__cloud_off() : m.project_launch__why()}>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-3" data-testid="project-launch-choices">
          {order.map((where, i) => {
            const Icon = where === 'cloud' ? Cloud : Laptop
            return (
              <Button
                key={where}
                variant={i === 0 ? 'hero' : 'heroGhost'}
                size="page"
                type="button"
                disabled={where === 'cloud' && choices.cloudOff}
                onClick={() => choices.onPick(where)}
              >
                <Icon className="size-5" aria-hidden="true" />
                {where === 'cloud' ? m.project_launch__cloud() : m.project_launch__local()}
              </Button>
            )
          })}
        </div>
      </StateScreen>
    )
  }

  return (
    <StateScreen label={title} hue="teal" page="resume" title={title} why={text}>
      <div role="status" aria-live="polite" className="sr-only">{title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button variant="hero" size="page" type="button" disabled={busy} aria-busy={busy} onClick={onStart}>
          {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
          {busy ? m.app_not_running__starting_button() : m.app_not_running__start()}
        </Button>
      </div>
    </StateScreen>
  )
}
