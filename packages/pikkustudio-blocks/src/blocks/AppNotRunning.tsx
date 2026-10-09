import { asI18n, type I18nString } from '@pikku/react'
import { useContext, useState } from 'react'
import { Check, ChevronDown, Copy, LoaderCircle, Play, RefreshCw } from 'lucide-react'
import { usePikkuQuery } from '@project/functions-sdk/pikku/api.gen'
import { m } from '@/i18n/messages'
import { useProjectKey } from '../lib/project'
import { ShellCtx } from '../lib/shell'
import { Button } from '../ui/button'
import { MachineOpening, OpeningStage, type OpeningStep } from './MachineOpening'
import { PikkuDot } from './PikkuDot'
import { StateScreen } from './StateScreen'

export type AppNotRunningState = 'off' | 'starting' | 'failed'

type StartingApp = { state: 'starting' | 'ready' | 'failed' }

export function startSteps(opened: boolean, apps: StartingApp[]): OpeningStep[] {
  const up = opened || apps.length > 0
  const ready = apps.length > 0 && apps.every((a) => a.state === 'ready')
  return [
    { label: m.app_not_running__step_server(), state: up ? 'done' : 'now' },
    { label: m.app_not_running__step_wait(), state: !up ? 'wait' : ready ? 'done' : 'now' },
    { label: m.app_not_running__step_open(), state: ready ? 'done' : 'wait' },
  ]
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

function Art({ state }: { state: AppNotRunningState }) {
  const soft = 'motion-safe:animate-pulse'
  return (
    <>
      <circle cx="240" cy="30" r="110" className="fill-w1" />
      <circle cx="40" cy="185" r="95" className="fill-w2" />
      <circle cx="274" cy="172" r="8" className="fill-coral" />
      <rect x="62" y="48" width="176" height="108" rx="12" className="fill-w6" opacity="0.92" />
      <circle cx="78" cy="63" r="4" className="fill-w2" />
      <circle cx="92" cy="63" r="4" className="fill-w2" />
      <circle cx="106" cy="63" r="4" className="fill-w2" />
      <rect x="72" y="76" width="156" height="70" rx="8" className="fill-w2" />
      {state === 'off' && (
        <>
          <circle cx="150" cy="112" r="16" fill="none" className="stroke-w6" strokeWidth="3" strokeDasharray="70 32" strokeDashoffset="-17" strokeLinecap="round" />
          <path d="M150 94v14" className="stroke-w6" strokeWidth="3" strokeLinecap="round" />
        </>
      )}
      {state === 'starting' && (
        <>
          <rect x="84" y="88" width="70" height="9" rx="4.5" className={`fill-w3 ${soft}`} />
          <rect x="84" y="104" width="130" height="7" rx="3.5" className={`fill-w3 ${soft}`} style={{ animationDelay: '0.25s' }} />
          <rect x="84" y="118" width="104" height="7" rx="3.5" className={`fill-w3 ${soft}`} style={{ animationDelay: '0.5s' }} />
          <rect x="84" y="134" width="132" height="6" rx="3" className="fill-w1" />
          <rect x="84" y="134" width="52" height="6" rx="3" className={`fill-w5 ${soft}`} />
        </>
      )}
      {state === 'failed' && (
        <>
          <rect x="84" y="88" width="70" height="9" rx="4.5" className="fill-w3" />
          <rect x="84" y="104" width="52" height="7" rx="3.5" className="fill-w3" />
          <rect x="84" y="118" width="130" height="22" rx="7" fill="none" className="stroke-w6" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
        </>
      )}
    </>
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
}: {
  state: AppNotRunningState
  name?: string
  what?: I18nString
  onStart: () => void
  starting?: boolean
  steps?: OpeningStep[]
  error?: unknown
}) {
  const { say } = useContext(ShellCtx)
  const [explain, setExplain] = useState(false)
  const [copied, setCopied] = useState(false)
  const log = useFailureLog(state === 'failed', error)
  const who = name ?? m.app_not_running__your_app()
  const thing = what ?? m.app_not_running__what_default()
  const busy = state === 'starting' || starting

  const title =
    state === 'failed' ? m.app_not_running__failed_title({ name: who }) : busy ? m.app_not_running__starting_title({ name: who }) : m.app_not_running__off_title({ name: who })
  const text =
    state === 'failed'
      ? reasonOf(log)
      : busy
          ? m.app_not_running__starting_text({ what: thing })
          : m.app_not_running__off_text({ what: thing })

  if (state === 'starting' && steps) {
    return (
      <div className="mx-auto flex max-w-[1160px] flex-col gap-10 @min-[1700px]/app:max-w-[1380px]">
        <OpeningStage label={title}>
          <MachineOpening title={title} lead={text} steps={steps} />
        </OpeningStage>
      </div>
    )
  }

  return (
    <StateScreen label={title} hue={state === 'failed' ? 'petrol' : 'teal'} art={<Art state={state} />} title={title} why={text}>
      <div role="status" aria-live="polite" className="sr-only">{title}</div>
      <div className="mt-1 flex flex-wrap items-center gap-x-6 gap-y-3">
        <Button variant="hero" size="page" type="button" disabled={busy} aria-busy={busy} onClick={onStart}>
          {busy ? <LoaderCircle className="size-5 animate-spin" aria-hidden="true" /> : state === 'failed' ? <RefreshCw className="size-5" aria-hidden="true" /> : <Play className="size-5" aria-hidden="true" />}
          {busy ? m.app_not_running__starting_button() : state === 'failed' ? m.app_not_running__try_again() : m.app_not_running__start()}
        </Button>
        {state === 'failed' ? (
          <button type="button" aria-expanded={explain} onClick={() => setExplain((v) => !v)} className="inline-flex items-center gap-1.5 text-px15 font-semibold text-hero-ink underline-offset-2 hover:underline">
            <ChevronDown className={`size-4 transition-transform ${explain ? 'rotate-180' : ''}`} aria-hidden="true" />
            {explain ? m.app_not_running__hide() : m.app_not_running__what_happened()}
          </button>
        ) : null}
        {state === 'failed' ? (
          <Button variant="heroGhost" size="page" type="button" onClick={() => say(m.app_not_running__fix_say({ name: who, log: asI18n(log) }))}>
            <PikkuDot />
            {m.app_not_running__ask_fix()}
          </Button>
        ) : null}
      </div>
      {state === 'failed' && explain ? (
        <div className="rounded-xl bg-secondary p-4 text-start text-foreground">
          <b className="mb-1.5 block text-px15">{m.app_not_running__details_title()}</b>
          <pre dir="ltr" className="m-0 max-h-48 overflow-auto font-mono text-px13 whitespace-pre-wrap text-ink-2" data-testid="app-start-log">{asI18n(log || m.app_not_running__reason_none())}</pre>
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
    </StateScreen>
  )
}
