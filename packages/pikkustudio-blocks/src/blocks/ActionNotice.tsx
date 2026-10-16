import { type I18nString, asI18n } from '@pikku/react'
import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Copy, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { m } from '@/i18n/messages'
import { useCopy } from '../lib/copy'
import { anonymise, useErrorReports } from '../lib/errorReports'
import { Button } from '../ui/button'
import { ErrorReportDrawer } from './ErrorReportDrawer'
import { detailsOf, faultOf, isPikkuFault } from './ErrorState'

const denied = (f: ReturnType<typeof faultOf>) => f.status === 403 || /permission denied|forbidden/i.test(f.message ?? '')

const signedOut = (f: ReturnType<typeof faultOf>, match?: RegExp) => !!match && match.test(f.message ?? '')

export function ActionNotice({ error, what, onRetry, retrying }: { error: unknown; what: I18nString; onRetry?: () => void; retrying?: boolean }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [asking, setAsking] = useState(false)
  const [passed, setPassed] = useState(false)
  const { choice, canSend, set, send } = useErrorReports()
  const copy = useCopy()
  const fault = faultOf(error)
  const details = detailsOf(fault, what)
  const ours = isPikkuFault(fault) && !denied(fault) && !signedOut(fault, copy.signedOutMatch)
  const navigate = useNavigate()
  const sentFor = useRef<unknown>(null)

  useEffect(() => {
    if (!ours || choice !== 'on' || !canSend || sentFor.current === error) return
    sentFor.current = error
    void send(anonymise(fault)).then(setPassed)
  }, [ours, choice, canSend, error, send, fault])

  const because = denied(fault) ? copy.deniedBecause?.find((reason) => reason.match.test(fault.message ?? '')) : undefined
  const body = signedOut(fault, copy.signedOutMatch) ? copy.noticeSignedOut({ what }) : because ? because.text({ what }) : denied(fault) ? copy.noticeDenied({ what }) : ours ? m.action_notice__ours({ what }) : m.action_notice__generic({ what })

  return (
    <div role="alert" className="max-w-xl rounded-card bg-destructive-soft p-5 text-foreground" data-testid="action-notice">
      <div className="flex items-start gap-3">
        <TriangleAlert className="mt-0.5 size-5 shrink-0 text-destructive-foreground" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <b className="block text-px17">{m.action_notice__title()}</b>
          <p className="mt-0.5 text-px15 text-pretty text-foreground">{body}</p>
          {ours && passed ? <p className="mt-1 text-px15 text-foreground">{m.action_notice__told()}</p> : null}
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
            {onRetry ? (
              <Button variant="default" size="compact" type="button" onClick={onRetry} disabled={retrying} aria-busy={retrying}>
                {retrying ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                {retrying ? m.action_notice__retrying() : m.query_state__try_again()}
              </Button>
            ) : null}
            {because?.fix ? (
              <Button variant="default" size="compact" type="button" onClick={() => void navigate({ to: because.fix!.to as never })}>
                {because.fix.label()}
              </Button>
            ) : null}
            {signedOut(fault, copy.signedOutMatch) ? (
              <Button variant="default" size="compact" type="button" onClick={() => void navigate({ to: '/account' as never })}>
                {m.action_notice__sign_in_again()}
              </Button>
            ) : null}
            <button type="button" aria-expanded={open} onClick={() => setOpen((v) => !v)} className="inline-flex items-center gap-1.5 text-px15 font-semibold text-foreground underline-offset-2 hover:underline">
              <ChevronDown className={`size-4 transition-transform ${open ? 'rotate-180' : ''}`} />
              {open ? m.action_notice__hide() : m.action_notice__what_happened()}
            </button>
            {ours && choice === 'unset' ? (
              <button type="button" onClick={() => setAsking(true)} className="text-px15 font-semibold text-ink-2 underline-offset-2 hover:underline">
                {m.action_notice__tell_us()}
              </button>
            ) : null}
          </div>
          {open ? (
            <div className="mt-3 rounded-2xl bg-card/70 p-3">
              <pre dir="ltr" className="m-0 max-h-40 overflow-auto font-mono text-px13 whitespace-pre-wrap text-foreground" data-testid="error-details">{asI18n(details)}</pre>
              <Button variant="bordered" size="compact" type="button" className="mt-2" onClick={() => void navigator.clipboard?.writeText(details).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000) })}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? m.action_notice__copied() : m.action_notice__copy()}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
      {asking ? <ErrorReportDrawer onTurnOn={() => set('on')} onClose={() => setAsking(false)} /> : null}
    </div>
  )
}
