import { useContext, useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { m } from '@/i18n/messages'
import { ShellCtx } from '../lib/shell'
import { anonymise, useErrorReports } from '../lib/errorReports'
import { Button } from '../ui/button'
import { ErrorReportDrawer } from './ErrorReportDrawer'
import { PikkuDot } from './PikkuDot'

type Fault = { name?: string; message?: string; errorId?: string; status?: number }

const OURS = /^(Unprocessable|InternalServer|NotFound|BadGateway|ServiceUnavailable|GatewayTimeout)/

export const faultOf = (error: unknown): Fault => {
  const e = (error ?? {}) as Fault
  return { name: e.name, message: e.message, errorId: e.errorId, status: e.status }
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

export function ErrorState({ error, what, onRetry, retrying }: { error: unknown; what?: string; onRetry?: () => void; retrying?: boolean }) {
  const { say } = useContext(ShellCtx)
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [asking, setAsking] = useState(false)
  const [passed, setPassed] = useState(false)
  const { choice, canSend, set, send } = useErrorReports()
  const fault = faultOf(error)
  const details = detailsOf(fault, what)
  const ours = isPikkuFault(fault)
  const sentFor = useRef<unknown>(null)

  useEffect(() => {
    if (!ours || choice !== 'on' || !canSend || sentFor.current === error) return
    sentFor.current = error
    void send(anonymise(fault)).then(setPassed)
  }, [ours, choice, canSend, error, send, fault])

  return (
    <div role="alert" className="flex flex-col items-center gap-4 rounded-card border border-border bg-card px-6 py-9 text-center shadow-card" data-testid="error-state">
      <Spot ours={ours} />
      <div>
        <b className="block font-heading text-[22px] text-foreground">{m.query_state__that_did_not_load()}</b>
        <p className="mx-auto mt-1 max-w-ch56 text-[16px] text-pretty text-ink-2">
          {ours ? "This is on Pikku's side, not in your project. Nothing in your project was changed." : m.query_state__something_went_wrong_on()}
        </p>
        {ours && passed ? <p className="mx-auto mt-1 max-w-ch56 text-px15 text-ink-2">We have passed this on to the Pikku team.</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {!ours ? (
          <Button variant="default" size="page" type="button" disabled={retrying} onClick={() => say(`Something did not load${what ? ` (${what})` : ''}. Please find out why and file a change request to fix it. Say "change request" in your reply, then tell me in plain words what you changed.\n\n${details}`)}>
            <PikkuDot />
            Fix this for me
          </Button>
        ) : null}
        {onRetry ? (
          <Button variant={ours ? 'default' : 'bordered'} size="page" type="button" onClick={onRetry} disabled={retrying} aria-busy={retrying}>
            {retrying ? <LoaderCircle className="size-4.5 animate-spin" /> : <RefreshCw className="size-4.5" />}
            {retrying ? 'Trying again…' : m.query_state__try_again()}
          </Button>
        ) : null}
      </div>
      {ours && choice === 'unset' ? (
        <button type="button" onClick={() => setAsking(true)} className="text-px15 font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
          Want Pikku to be told about errors like this?
        </button>
      ) : null}
      <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-px15 font-semibold text-muted-foreground hover:text-foreground">
        <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
        {open ? 'Hide the details' : 'Show the details'}
      </button>
      {open ? (
        <div className="w-full max-w-xl rounded-xl bg-secondary p-4 text-left">
          <pre className="m-0 max-h-48 overflow-auto font-mono text-px13 whitespace-pre-wrap text-ink-2" data-testid="error-details">{details}</pre>
          <Button
            variant="bordered"
            size="compact"
            type="button"
            className="mt-3"
            onClick={() => void navigator.clipboard?.writeText(details).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}
          >
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? 'Copied' : 'Copy the details'}
          </Button>
        </div>
      ) : null}
      {asking ? <ErrorReportDrawer onTurnOn={() => set('on')} onClose={() => setAsking(false)} /> : null}
    </div>
  )
}
