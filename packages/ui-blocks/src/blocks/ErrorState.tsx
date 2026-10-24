import { type I18nString, asI18n } from '@pikku/react'
import { useContext, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { m } from '@/i18n/messages'
import { ShellCtx } from '../lib/shell'
import { anonymise, useErrorReports } from '../lib/errorReports'
import { Button } from '../ui/button'
import { ErrorReportDrawer } from './ErrorReportDrawer'
import { PikkuDot } from './PikkuDot'
import { CloudOffline } from './CloudOffline'

type Fault = { name?: string; message?: string; errorId?: string; status?: number; fix?: string }

const OURS = /^(Unprocessable|InternalServer|NotFound|BadGateway|ServiceUnavailable|GatewayTimeout)/

export const faultOf = (error: unknown): Fault => {
  const e = (error ?? {}) as Fault & { body?: { payload?: { fix?: unknown } } }
  const fix = e.body?.payload?.fix
  return { name: e.name, message: e.message, errorId: e.errorId, status: e.status, fix: typeof fix === 'string' ? fix : undefined }
}

export const isPikkuFault = (f: Fault) => OURS.test(f.name ?? '') || (f.status ?? 0) >= 500 || /PKU\d+/.test(f.message ?? '')

export const detailsOf = (f: Fault, what?: string) =>
  [what ? `Where: ${what}` : '', `What: ${f.name ?? 'Error'}`, `It said: ${f.message ?? 'nothing'}`, f.errorId ? `Error id: ${f.errorId}` : '', `When: ${new Date().toISOString()}`]
    .filter(Boolean)
    .join('\n')

function Spot({ ours }: { ours: boolean }) {
  const [a, b] = ours ? ['fill-destructive-soft', 'fill-destructive/20'] : ['fill-warning/25', 'fill-warning/45']
  return (
    <div className="relative grid size-32 shrink-0 place-items-center" aria-hidden="true">
      <svg viewBox="0 0 128 128" className="absolute inset-0 size-full">
        <circle cx="64" cy="66" r="56" className={a} />
        <circle cx="98" cy="30" r="20" className={b} />
        <circle cx="26" cy="96" r="12" className="fill-surface-3" />
        <circle cx="64" cy="66" r="40" fill="none" className="stroke-input" strokeWidth="2" strokeDasharray="2 7" strokeLinecap="round" />
      </svg>
      <span className={`relative grid size-16 place-items-center rounded-card bg-card shadow-card ${ours ? 'text-destructive' : 'text-warning-ink'}`}>
        <TriangleAlert className="size-8" />
      </span>
    </div>
  )
}

export function ErrorState({ error, what, onRetry, retrying }: { error: unknown; what?: I18nString; onRetry?: () => void; retrying?: boolean }) {
  const { say } = useContext(ShellCtx)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [asking, setAsking] = useState(false)
  const [passed, setPassed] = useState(false)
  const { choice, canSend, set, send } = useErrorReports()
  const fault = faultOf(error)
  const details = detailsOf(fault, what)
  const offline = fault.name === 'CloudUnreachableError'
  const ours = !offline && isPikkuFault(fault)
  const sentFor = useRef<unknown>(null)

  useEffect(() => {
    if (!ours || choice !== 'on' || !canSend || sentFor.current === error) return
    sentFor.current = error
    void send(anonymise(fault)).then(setPassed)
  }, [ours, choice, canSend, error, send, fault])

  if (offline) return <CloudOffline onRetry={onRetry} />
  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-card border border-border bg-card px-6 py-9 text-center shadow-card" data-testid="error-state">
      <Spot ours={ours} />
      <div>
        <b className="block font-heading text-[22px] text-foreground">{m.query_state__that_did_not_load()}</b>
        <p className="mx-auto mt-1 max-w-ch56 text-[16px] text-pretty text-ink-2">
          {ours ? m.error_state__ours_note() : m.query_state__something_went_wrong_on()}
        </p>
        {ours && passed ? <p className="mx-auto mt-1 max-w-ch56 text-px15 text-ink-2">{m.action_notice__told()}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!ours ? (
          <Button variant="default" size="page" type="button" disabled={retrying} onClick={() => say(what ? m.error_state__fix_ask_what({ what, details }) : m.error_state__fix_ask({ details }))}>
            <PikkuDot />
            {m.metrics_screen__fix_it()}
          </Button>
        ) : null}
        {onRetry ? (
          <Button variant={ours ? 'default' : 'bordered'} size="page" type="button" onClick={onRetry} disabled={retrying} aria-busy={retrying}>
            {retrying ? <LoaderCircle className="size-4.5 animate-spin" /> : <RefreshCw className="size-4.5" />}
            {retrying ? m.action_notice__retrying() : m.query_state__try_again()}
          </Button>
        ) : null}
      </div>
      {ours && choice === 'unset' ? (
        <button type="button" onClick={() => setAsking(true)} className="text-px15 font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          {m.action_notice__tell_us()}
        </button>
      ) : null}
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-px15 font-semibold text-muted-foreground hover:text-foreground">
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? m.error_state__hide_details() : m.error_state__show_details()}
      </button>
      {open ? (
        <div className="w-full max-w-xl rounded-xl bg-secondary p-4 text-start">
          <pre dir="ltr" className="m-0 max-h-48 overflow-auto font-mono text-px13 whitespace-pre-wrap text-ink-2" data-testid="error-details">{asI18n(details)}</pre>
          <Button
            variant="bordered"
            size="compact"
            type="button"
            className="mt-3"
            onClick={() => void navigator.clipboard?.writeText(details).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? m.common__copied() : m.action_notice__copy()}
          </Button>
        </div>
      ) : null}
      {asking ? <ErrorReportDrawer onTurnOn={() => set('on')} onClose={() => setAsking(false)} /> : null}
    </div>
  )
}
